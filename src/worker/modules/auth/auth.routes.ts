import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { loginRateLimit } from '@/worker/core/middleware/rate-limit';
import { createDb } from '@/worker/core/database';
import { UserRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { JwtService } from '@/worker/core/services/jwt.service';
import { TokenBlacklistRepository } from '@/worker/core/repositories/token-blacklist.repository';
import { setCookie, getCookie } from 'hono/cookie';
import { validateBody, getValidatedBody } from '@/worker/core/middleware/validator';
import { loginSchema, type LoginRequest } from './auth.dto';
import jwt from '@tsndr/cloudflare-worker-jwt';
import type { JwtPayload } from '@/worker/core/types';

// Type for storing services in context
type AuthVariables = {
	authService: AuthService;
	jwtService: JwtService;
	user: { userId: string };
};

type AuthEnv = { Bindings: Env; Variables: AuthVariables };

// Middleware to inject auth services into context
export const authServicesMiddleware = () => async (c: Context<AuthEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const jwtService = new JwtService(c.env.JWT_SECRET);
	const userRepository = new UserRepository(db);
	const authService = new AuthService(userRepository, jwtService);

	c.set('jwtService', jwtService);
	c.set('authService', authService);
	await next();
};

// Route handlers that use services from context
const loginHandler = async (c: Context<AuthEnv>) => {
	const authService = c.get('authService');
	const body = getValidatedBody<LoginRequest>(c);
	const result = await authService.login(body);

	setCookie(c, 'token', result.token, {
		httpOnly: true,
		secure: c.env.ENVIRONMENT === 'production',
		sameSite: 'Strict',
		maxAge: 60 * 60 * 24 * 7,
		path: '/',
	});

	return c.json({ data: result.user });
};

const meHandler = async (c: Context<AuthEnv>) => {
	const authService = c.get('authService');
	const user = c.get('user');
	const result = await authService.me(user.userId);
	return c.json({ data: result });
};

const logoutHandler = async (c: Context<AuthEnv>) => {
	const token = getCookie(c, 'token');

	// If token exists, add it to the blacklist
	if (token) {
		try {
			const decoded = jwt.decode(token) as { payload: JwtPayload };
			if (decoded?.payload?.jti && decoded?.payload?.exp && decoded?.payload?.userId) {
				const db = createDb(c.env.DB);
				const tokenBlacklistRepo = new TokenBlacklistRepository(db);

				// Calculate expiration date from JWT exp (Unix timestamp)
				const expiresAt = new Date(decoded.payload.exp * 1000).toISOString();

				await tokenBlacklistRepo.add({
					jti: decoded.payload.jti,
					userId: decoded.payload.userId,
					tokenHash: await hashToken(token),
					expiresAt,
				});
			}
		} catch (error) {
			// Log but don't fail logout if blacklisting fails
			console.error('Failed to blacklist token:', error);
		}
	}

	// Clear the cookie
	setCookie(c, 'token', '', {
		httpOnly: true,
		secure: c.env.ENVIRONMENT === 'production',
		sameSite: 'Strict',
		maxAge: 0,
		path: '/',
	});
	return c.json({ message: 'Logged out successfully' });
};

/**
 * Helper function to compute SHA-256 hash of a token
 */
async function hashToken(token: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(token);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Factory function to create auth router
export function createAuthRouter(): Hono<AuthEnv> {
	const router = new Hono<AuthEnv>();

	// Apply services middleware to all auth routes
	router.use('*', authServicesMiddleware());

	// Public routes (rate limited: 5 attempts per 15 min)
	router.post('/login', loginRateLimit(), validateBody(loginSchema), loginHandler);

	// Protected routes
	router.get('/me', authMiddleware(), meHandler);
	router.post('/logout', logoutHandler);

	return router;
}
