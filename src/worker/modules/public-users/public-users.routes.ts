import { Hono, Context } from 'hono';
import { setCookie, getCookie } from 'hono/cookie';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { createDb } from '@/worker/core/database';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { JwtService } from '@/worker/core/services/jwt.service';
import { TokenBlacklistRepository } from '@/worker/core/repositories/token-blacklist.repository';
import { createGoogleOAuthProvider, createWhatsAppProvider } from '@/worker/core/services/providers';
import { publicUserAuthMiddleware } from '@/worker/core/middleware/public-auth';
import { validateBody, getValidatedBody } from '@/worker/core/middleware/validator';
import { PublicUsersRepository } from './public-users.repository';
import { PublicUsersService } from './public-users.service';
import {
	googleLoginSchema,
	phoneInitSchema,
	phoneVerifySchema,
	updateProfileSchema,
	type GoogleLoginRequest,
	type PhoneInitRequest,
	type PhoneVerifyRequest,
	type UpdateProfileRequest,
} from './public-users.dto';

type PublicUsersVariables = {
	publicUsersService: PublicUsersService;
	jwtService: JwtService;
};
type PublicUsersEnv = { Bindings: Env; Variables: PublicUsersVariables };

export const publicUsersServicesMiddleware = () => async (c: Context<PublicUsersEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const configRepo = new ConfigRepository(db);
	const jwtService = new JwtService(c.env.JWT_SECRET);
	const repo = new PublicUsersRepository(db);
	const google = await createGoogleOAuthProvider(configRepo);
	const whatsapp = await createWhatsAppProvider(configRepo);
	const service = new PublicUsersService(repo, jwtService, google, whatsapp, configRepo);
	c.set('publicUsersService', service);
	c.set('jwtService', jwtService);
	await next();
};

/**
 * Set the public-user JWT in an httpOnly cookie. Cross-origin (landing page on a
 * different domain) requires SameSite=None;Secure in production over HTTPS. In dev
 * over http://localhost, Secure is dropped to Lax so cookies still work locally.
 */
function setPublicUserCookie(c: Context, token: string) {
	const isProd = c.env.ENVIRONMENT === 'production';
	setCookie(c, 'token', token, {
		httpOnly: true,
		secure: isProd,
		sameSite: isProd ? 'None' : 'Lax',
		maxAge: 60 * 60 * 24 * 7, // 7 days
		path: '/',
	});
}

function clearPublicUserCookie(c: Context) {
	const isProd = c.env.ENVIRONMENT === 'production';
	setCookie(c, 'token', '', {
		httpOnly: true,
		secure: isProd,
		sameSite: isProd ? 'None' : 'Lax',
		maxAge: 0,
		path: '/',
	});
}

const googleLoginHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const body = getValidatedBody<GoogleLoginRequest>(c);
	const result = await service.googleLogin(body);
	setPublicUserCookie(c, result.token);
	return c.json({
		success: true,
		message: result.requiresPhoneVerification ? 'Phone verification required' : 'Logged in',
		data: { user: result.user, requiresPhoneVerification: result.requiresPhoneVerification },
	});
};

const phoneInitHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const pu = c.get('publicUser');
	const body = getValidatedBody<PhoneInitRequest>(c);
	const result = await service.phoneInit(pu.publicUserId, body);
	return c.json({ success: true, message: 'Send the Ref code to our WhatsApp number', data: result });
};

const phoneVerifyHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const pu = c.get('publicUser');
	const body = getValidatedBody<PhoneVerifyRequest>(c);
	const result = await service.phoneVerify(pu.publicUserId, body);
	setPublicUserCookie(c, result.token);
	return c.json({ success: true, message: 'Phone verified', data: { user: result.user } });
};

const meHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const pu = c.get('publicUser');
	const user = await service.getMe(pu.publicUserId);
	return c.json({ success: true, data: user });
};

const profileHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const pu = c.get('publicUser');
	const body = getValidatedBody<UpdateProfileRequest>(c);
	const user = await service.updateProfile(pu.publicUserId, body);
	return c.json({ success: true, data: user });
};

const logoutHandler = async (c: Context<PublicUsersEnv>) => {
	const token = getCookie(c, 'token');
	if (token) {
		try {
			const decoded = jwt.decode(token) as { payload: { jti?: string; exp?: number; userId?: string } };
			if (decoded?.payload?.jti && decoded?.payload?.exp && decoded?.payload?.userId) {
				const db = createDb(c.env.DB);
				const tokenBlacklistRepo = new TokenBlacklistRepository(db);
				const expiresAt = new Date(decoded.payload.exp * 1000).toISOString();
				await tokenBlacklistRepo.add({
					jti: decoded.payload.jti,
					userId: decoded.payload.userId,
					tokenHash: await hashToken(token),
					expiresAt,
				});
			}
		} catch (error) {
			console.error('Failed to blacklist public-user token:', error);
		}
	}
	clearPublicUserCookie(c);
	return c.json({ success: true, message: 'Logged out' });
};

async function hashToken(token: string): Promise<string> {
	const data = new TextEncoder().encode(token);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Public-user auth router. Mounted under /api/v1/public/auth (inherits X-API-Key + CORS from the public router).
export function createPublicAuthRouter(): Hono<PublicUsersEnv> {
	const router = new Hono<PublicUsersEnv>();
	router.use('*', publicUsersServicesMiddleware());

	// Login (no cookie yet)
	router.post('/google', validateBody(googleLoginSchema), googleLoginHandler);

	// Phone verification (cookie-authenticated, phone may be unverified)
	router.post('/phone/init', publicUserAuthMiddleware(), validateBody(phoneInitSchema), phoneInitHandler);
	router.post('/phone/verify', publicUserAuthMiddleware(), validateBody(phoneVerifySchema), phoneVerifyHandler);

	// Account (cookie-authenticated)
	router.get('/me', publicUserAuthMiddleware(), meHandler);
	router.put('/profile', publicUserAuthMiddleware(), validateBody(updateProfileSchema), profileHandler);
	router.post('/logout', publicUserAuthMiddleware(), logoutHandler);

	return router;
}
