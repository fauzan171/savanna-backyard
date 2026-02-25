import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { UnauthorizedError } from '../types/errors';
import type { UserContext, JwtPayload } from '../types';

// Extend Hono's context variables
declare module 'hono' {
	interface ContextVariableMap {
		user: UserContext;
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
			const payload = jwt.decode(token) as { payload: JwtPayload };
			if (!payload?.payload?.userId) {
				throw new UnauthorizedError('Invalid token payload');
			}

			// Set user context
			c.set('user', {
				userId: payload.payload.userId,
				role: payload.payload.role,
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
					if (payload?.payload?.userId) {
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
