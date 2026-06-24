import { Hono, Context } from 'hono';
import { setCookie, getCookie } from 'hono/cookie';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { createDb } from '@/worker/core/database';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { JwtService } from '@/worker/core/services/jwt.service';
import { TokenBlacklistRepository } from '@/worker/core/repositories/token-blacklist.repository';
import { createWhatsAppProvider } from '@/worker/core/services/providers';
import { publicUserAuthMiddleware, requirePhoneVerified } from '@/worker/core/middleware/public-auth';
import { validateBody, getValidatedBody } from '@/worker/core/middleware/validator';
import { PublicUsersRepository } from './public-users.repository';
import { PublicUsersService } from './public-users.service';
import {
	phoneInitSchema,
	phoneVerifySchema,
	updateProfileSchema,
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
	const whatsapp = await createWhatsAppProvider(configRepo);
	const service = new PublicUsersService(repo, jwtService, whatsapp, configRepo);
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

// ---- Login (phone + WhatsApp OTP) — no cookie required, these SET the cookie ----
const phoneInitHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const body = getValidatedBody<PhoneInitRequest>(c);
	const result = await service.phoneInit(body);
	return c.json({ success: true, message: 'Send the Ref code to our WhatsApp number', data: result });
};

const phoneVerifyHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const body = getValidatedBody<PhoneVerifyRequest>(c);
	const result = await service.phoneVerify(body);
	setPublicUserCookie(c, result.token);
	return c.json({ success: true, message: 'Logged in', data: { user: result.user } });
};

// ---- Account (cookie-authenticated) ----
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

// Public-user auth router. Mounted under /api/v1/public/auth (inherits X-API-Key + CORS).
export function createPublicAuthRouter(): Hono<PublicUsersEnv> {
	const router = new Hono<PublicUsersEnv>();
	router.use('*', publicUsersServicesMiddleware());

	// Login (no cookie yet)
	router.post('/phone/init', validateBody(phoneInitSchema), phoneInitHandler);
	router.post('/phone/verify', validateBody(phoneVerifySchema), phoneVerifyHandler);

	// Account (cookie-authenticated)
	router.get('/me', publicUserAuthMiddleware(), meHandler);
	router.put('/profile', publicUserAuthMiddleware(), validateBody(updateProfileSchema), profileHandler);
	router.post('/logout', publicUserAuthMiddleware(), logoutHandler);

	return router;
}

// ---- /me: account-scoped booking access (mounted under /api/v1/public/me) ----
const myBookingsHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const pu = c.get('publicUser');
	const result = await service.myBookings(pu.publicUserId);
	return c.json({ success: true, data: result });
};

const myBookingDetailHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const pu = c.get('publicUser');
	const result = await service.myBookingDetail(pu.publicUserId, c.req.param('id'));
	return c.json({ success: true, data: result });
};

const payRemainingHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const pu = c.get('publicUser');
	const result = await service.payRemaining(pu.publicUserId, c.req.param('bookingId'));
	return c.json({ success: true, message: 'Reopen the invoice to pay the remainder', data: result });
};

export function createPublicMeRouter(): Hono<PublicUsersEnv> {
	const router = new Hono<PublicUsersEnv>();
	router.use('*', publicUsersServicesMiddleware());
	router.use('*', publicUserAuthMiddleware());

	router.get('/bookings', myBookingsHandler);
	router.get('/bookings/:id', myBookingDetailHandler);
	// Pay the remainder requires a verified account (anti-abuse)
	router.post('/bookings/:bookingId/pay-remaining', requirePhoneVerified(), payRemainingHandler);

	return router;
}
