import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { TrailsRepository } from './trails.repository';
import { TrailsService } from './trails.service';
import { validateBody, getValidatedBody } from '@/worker/core/middleware/validator';
import { createTrailSchema, updateTrailSchema, type CreateTrailRequest, type UpdateTrailRequest } from './trails.dto';

type TrailsVariables = {
	trailsService: TrailsService;
	user: { userId: string; role: 'SUPER_ADMIN' | 'STAFF' };
};

type TrailsEnv = { Bindings: Env; Variables: TrailsVariables };

const trailsServicesMiddleware = () => async (c: Context<TrailsEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const trailsRepository = new TrailsRepository(db);
	const trailsService = new TrailsService(trailsRepository);
	c.set('trailsService', trailsService);
	await next();
};

const requireSuperAdmin = (c: Context<TrailsEnv>) => {
	const user = c.get('user');
	if (user.role !== 'SUPER_ADMIN') {
		return c.json({ success: false, message: 'Forbidden', error: { code: 'FORBIDDEN', message: 'SUPER_ADMIN only' } }, 403);
	}
	return null;
};

const listHandler = async (c: Context<TrailsEnv>) => {
	const service = c.get('trailsService');
	const result = await service.list();
	return c.json({ success: true, data: result });
};

const getByIdHandler = async (c: Context<TrailsEnv>) => {
	const service = c.get('trailsService');
	const id = c.req.param('id');
	const result = await service.getById(id);
	return c.json({ success: true, data: result });
};

const createHandler = async (c: Context<TrailsEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('trailsService');
	const body = getValidatedBody<CreateTrailRequest>(c);
	const result = await service.create(body);
	return c.json({ success: true, message: 'Trail created', data: result }, 201);
};

const updateHandler = async (c: Context<TrailsEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('trailsService');
	const id = c.req.param('id');
	const body = getValidatedBody<UpdateTrailRequest>(c);
	const result = await service.update(id, body);
	return c.json({ success: true, data: result });
};

const deleteHandler = async (c: Context<TrailsEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('trailsService');
	const id = c.req.param('id');
	await service.delete(id);
	return c.json({ success: true, message: 'Trail deleted' });
};

const toggleHandler = async (c: Context<TrailsEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('trailsService');
	const id = c.req.param('id');
	const result = await service.toggle(id);
	return c.json({ success: true, data: result });
};

export function createTrailsRouter(): Hono<TrailsEnv> {
	const router = new Hono<TrailsEnv>();
	router.use('*', trailsServicesMiddleware());
	router.use('*', authMiddleware());

	router.get('/', listHandler);
	router.get('/:id', getByIdHandler);
	router.post('/', validateBody(createTrailSchema), createHandler);
	router.patch('/:id', validateBody(updateTrailSchema), updateHandler);
	router.delete('/:id', deleteHandler);
	router.patch('/:id/toggle', toggleHandler);

	return router;
}
