import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { UnauthorizedError } from '../types/errors';
import type { UserContext, PublicUserContext, JwtPayload } from '../types';
import { createDb } from '../database';
import { TokenBlacklistRepository } from '../repositories/token-blacklist.repository';

// Extend Hono's context variables
declare module 'hono' {
	interface ContextVariableMap {
		user: UserContext;
		publicUser: PublicUserContext;
		body: unknown;
		query: unknown;
	}
}

export function authMiddleware() {
	return async (c: Context, next: Next) => {
		// Get token from Authorization header or cookie
		const authHeader = c.req.header('Authorization');
		let token: string | undefined;

		if (authHeader?.startsWith('Bearer ')) {
			token = authHeader.slice(7);
		} else {
			token = getCookie(c, 'token');
		}

		if (!token) {
			throw new UnauthorizedError('No token provided');
		}

		try {
			// Verify JWT
			const isValid = await jwt.verify(token, c.env.JWT_SECRET);
			if (!isValid) {
				throw new UnauthorizedError('Invalid token');
			}

			// Decode to get payload
			const decoded = jwt.decode(token) as { payload: JwtPayload };
			if (!decoded?.payload?.userId || !decoded?.payload?.jti) {
				throw new UnauthorizedError('Invalid token payload');
			}

			const payload = decoded.payload;

			// Enforce admin token type: reject public-user tokens from admin routes.
			// Absent type = legacy admin token issued before the type claim existed.
			const tokenType = payload.type ?? 'admin';
			if (tokenType !== 'admin' || !payload.role) {
				throw new UnauthorizedError('Invalid token type');
			}

			// Check if token is blacklisted
			const db = createDb(c.env.DB);
			const tokenBlacklistRepo = new TokenBlacklistRepository(db);

			const isBlacklisted = await tokenBlacklistRepo.isJtiBlacklisted(payload.jti);
			if (isBlacklisted) {
				throw new UnauthorizedError('Token has been revoked');
			}

			// Set user context
			c.set('user', {
				userId: payload.userId,
				role: payload.role,
			});

			await next();
		} catch (error) {
			if (error instanceof UnauthorizedError) {
				throw error;
			}
			throw new UnauthorizedError('Token verification failed');
		}
	};
}

// Optional auth - doesn't throw if no token, but sets user if valid
export function optionalAuth() {
	return async (c: Context, next: Next) => {
		const authHeader = c.req.header('Authorization');
		let token: string | undefined;

		if (authHeader?.startsWith('Bearer ')) {
			token = authHeader.slice(7);
		} else {
			token = getCookie(c, 'token');
		}

		if (token) {
			try {
				const isValid = await jwt.verify(token, c.env.JWT_SECRET);
				if (isValid) {
					const payload = jwt.decode(token) as { payload: JwtPayload };
					// Only adopt admin tokens here (public-user tokens are never treated as admin)
					if (payload?.payload?.userId && (payload.payload.type ?? 'admin') === 'admin' && payload.payload.role) {
						c.set('user', {
							userId: payload.payload.userId,
							role: payload.payload.role,
						});
					}
				}
			} catch {
				// Ignore errors for optional auth
			}
		}

		await next();
	};
}

// Role-based authorization
export function requireRole(...roles: ('SUPER_ADMIN' | 'STAFF')[]) {
	return async (c: Context, next: Next) => {
		const user = c.get('user');
		if (!user) {
			throw new UnauthorizedError('Not authenticated');
		}

		if (!roles.includes(user.role)) {
			throw new UnauthorizedError('Insufficient permissions');
		}

		await next();
	};
}
