import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { UnauthorizedError } from '../types/errors';
import { createDb } from '../database';
import { publicUsers } from '../database/schema';
import { TokenBlacklistRepository } from '../repositories/token-blacklist.repository';

/**
 * Auth middleware for public (landing-page) end-users.
 *
 * Reads the httpOnly 'token' cookie (or Bearer header), requires a `type: 'public'`
 * JWT, checks the revocation blacklist, loads the current public_users row so
 * phoneVerified / isActive are always fresh, and sets c.get('publicUser').
 * Admin tokens are explicitly rejected here (type isolation).
 */
export function publicUserAuthMiddleware() {
	return async (c: Context, next: Next) => {
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
			const isValid = await jwt.verify(token, c.env.JWT_SECRET);
			if (!isValid) {
				throw new UnauthorizedError('Invalid token');
			}

			const decoded = jwt.decode(token) as { payload: { userId: string; type?: string; jti: string } };
			if (!decoded?.payload?.userId || !decoded?.payload?.jti) {
				throw new UnauthorizedError('Invalid token payload');
			}

			const payload = decoded.payload;
			if (payload.type !== 'public') {
				throw new UnauthorizedError('Invalid token type');
			}

			// Revocation check (same blacklist as admin)
			const db = createDb(c.env.DB);
			const tokenBlacklistRepo = new TokenBlacklistRepository(db);
			if (await tokenBlacklistRepo.isJtiBlacklisted(payload.jti)) {
				throw new UnauthorizedError('Token has been revoked');
			}

			// Load current record so phoneVerified / isActive are always fresh
			const [user] = await db.select().from(publicUsers).where(eq(publicUsers.id, payload.userId)).limit(1);
			if (!user || !user.isActive) {
				throw new UnauthorizedError('Account not found or deactivated');
			}

			c.set('publicUser', {
				publicUserId: user.id,
				email: user.email,
				name: user.name,
				phone: user.phone,
				phoneVerified: user.phoneVerified,
			});

			await next();
		} catch (error) {
			if (error instanceof UnauthorizedError) throw error;
			throw new UnauthorizedError('Token verification failed');
		}
	};
}

/** Guard: requires the authenticated public user to have a verified phone number. */
export function requirePhoneVerified() {
	return async (c: Context, next: Next) => {
		const pu = c.get('publicUser');
		if (!pu) {
			throw new UnauthorizedError('Not authenticated');
		}
		if (!pu.phoneVerified) {
			throw new UnauthorizedError('Phone number not verified');
		}
		await next();
	};
}
