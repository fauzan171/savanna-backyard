import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { ReviewsRepository } from './reviews.repository';
import { ReviewsService } from './reviews.service';
import { validateBody, getValidatedBody } from '@/worker/core/middleware/validator';
import { createReviewSchema, updateReviewSchema, type CreateReviewRequest, type UpdateReviewRequest } from './reviews.dto';

type ReviewsVariables = {
	reviewsService: ReviewsService;
	user: { userId: string; role: 'SUPER_ADMIN' | 'STAFF' };
};

type ReviewsEnv = { Bindings: Env; Variables: ReviewsVariables };

const reviewsServicesMiddleware = () => async (c: Context<ReviewsEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const reviewsRepository = new ReviewsRepository(db);
	const reviewsService = new ReviewsService(reviewsRepository);
	c.set('reviewsService', reviewsService);
	await next();
};

const requireSuperAdmin = (c: Context<ReviewsEnv>) => {
	const user = c.get('user');
	if (user.role !== 'SUPER_ADMIN') {
		return c.json({ success: false, message: 'Forbidden', error: { code: 'FORBIDDEN', message: 'SUPER_ADMIN only' } }, 403);
	}
	return null;
};

const listHandler = async (c: Context<ReviewsEnv>) => {
	const service = c.get('reviewsService');
	const result = await service.list();
	return c.json({ success: true, data: result });
};

const getByIdHandler = async (c: Context<ReviewsEnv>) => {
	const service = c.get('reviewsService');
	const id = c.req.param('id');
	const result = await service.getById(id);
	return c.json({ success: true, data: result });
};

const createHandler = async (c: Context<ReviewsEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('reviewsService');
	const body = getValidatedBody<CreateReviewRequest>(c);
	const result = await service.create(body);
	return c.json({ success: true, message: 'Review created', data: result }, 201);
};

const updateHandler = async (c: Context<ReviewsEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('reviewsService');
	const id = c.req.param('id');
	const body = getValidatedBody<UpdateReviewRequest>(c);
	const result = await service.update(id, body);
	return c.json({ success: true, data: result });
};

const deleteHandler = async (c: Context<ReviewsEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('reviewsService');
	const id = c.req.param('id');
	await service.delete(id);
	return c.json({ success: true, message: 'Review deleted' });
};

const toggleHandler = async (c: Context<ReviewsEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('reviewsService');
	const id = c.req.param('id');
	const result = await service.toggle(id);
	return c.json({ success: true, data: result });
};

export function createReviewsRouter(): Hono<ReviewsEnv> {
	const router = new Hono<ReviewsEnv>();
	router.use('*', reviewsServicesMiddleware());
	router.use('*', authMiddleware());

	router.get('/', listHandler);
	router.get('/:id', getByIdHandler);
	router.post('/', validateBody(createReviewSchema), createHandler);
	router.patch('/:id', validateBody(updateReviewSchema), updateHandler);
	router.delete('/:id', deleteHandler);
	router.patch('/:id/toggle', toggleHandler);

	return router;
}
