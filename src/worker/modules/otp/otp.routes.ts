import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { PublicUsersRepository } from '@/worker/modules/public-users/public-users.repository';

type OtpVariables = {
	user: { userId: string; role: 'SUPER_ADMIN' | 'STAFF' };
	repo: PublicUsersRepository;
};

type OtpEnv = { Bindings: Env; Variables: OtpVariables };

const otpServicesMiddleware = () => async (c: Context<OtpEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	c.set('repo', new PublicUsersRepository(db));
	await next();
};

const requireSuperAdmin = (c: Context<OtpEnv>) => {
	const user = c.get('user');
	if (user.role !== 'SUPER_ADMIN') {
		return c.json({ success: false, message: 'Forbidden', error: { code: 'FORBIDDEN', message: 'SUPER_ADMIN only' } }, 403);
	}
	return null;
};

export function createOtpRouter(): Hono<OtpEnv> {
	const router = new Hono<OtpEnv>();
	router.use('*', otpServicesMiddleware());
	router.use('*', authMiddleware());

	router.get('/', async (c: Context<OtpEnv>) => {
		const forbidden = requireSuperAdmin(c);
		if (forbidden) return forbidden;

		const limitParam = Number(c.req.query('limit') ?? '100');
		const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 100;
		const rows = await c.get('repo').listVerificationCodes(limit);
		const now = Date.now();
		return c.json({
			success: true,
			data: rows.map((row) => ({
				id: row.id,
				phone: row.phone,
				refCode: row.refCode,
				otpCode: row.otpCode,
				deliveryChannel: row.deliveryChannel,
				status: row.consumed ? 'verified' : new Date(row.expiresAt).getTime() < now ? 'expired' : row.status,
				consumed: row.consumed,
				attempts: row.attempts,
				expiresAt: row.expiresAt,
				createdAt: row.createdAt,
			})),
		});
	});

	return router;
}
