import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { PricingRepository } from './pricing.repository';
import { PricingService } from './pricing.service';
import { validateBody, getValidatedBody } from '@/worker/core/middleware/validator';
import { createPricingSchema, updatePricingSchema, type CreatePricingRequest, type UpdatePricingRequest } from './pricing.dto';

type PricingVariables = {
	pricingService: PricingService;
	user: { userId: string; role: 'SUPER_ADMIN' | 'STAFF' };
};

type PricingEnv = { Bindings: Env; Variables: PricingVariables };

const pricingServicesMiddleware = () => async (c: Context<PricingEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const pricingRepository = new PricingRepository(db);
	const pricingService = new PricingService(pricingRepository);
	c.set('pricingService', pricingService);
	await next();
};

const requireSuperAdmin = (c: Context<PricingEnv>) => {
	const user = c.get('user');
	if (user.role !== 'SUPER_ADMIN') {
		return c.json({ success: false, message: 'Forbidden', error: { code: 'FORBIDDEN', message: 'SUPER_ADMIN only' } }, 403);
	}
	return null;
};

const listHandler = async (c: Context<PricingEnv>) => {
	const service = c.get('pricingService');
	const result = await service.list();
	return c.json({ success: true, data: result });
};

const getByIdHandler = async (c: Context<PricingEnv>) => {
	const service = c.get('pricingService');
	const id = c.req.param('id');
	const result = await service.getById(id);
	return c.json({ success: true, data: result });
};

const createHandler = async (c: Context<PricingEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('pricingService');
	const body = getValidatedBody<CreatePricingRequest>(c);
	const result = await service.create(body);
	return c.json({ success: true, message: 'Pricing tier created', data: result }, 201);
};

const updateHandler = async (c: Context<PricingEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('pricingService');
	const id = c.req.param('id');
	const body = getValidatedBody<UpdatePricingRequest>(c);
	const result = await service.update(id, body);
	return c.json({ success: true, data: result });
};

const deleteHandler = async (c: Context<PricingEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('pricingService');
	const id = c.req.param('id');
	await service.delete(id);
	return c.json({ success: true, message: 'Pricing tier deleted' });
};

const toggleHandler = async (c: Context<PricingEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('pricingService');
	const id = c.req.param('id');
	const result = await service.toggle(id);
	return c.json({ success: true, data: result });
};

export function createPricingRouter(): Hono<PricingEnv> {
	const router = new Hono<PricingEnv>();
	router.use('*', pricingServicesMiddleware());
	router.use('*', authMiddleware());

	router.get('/', listHandler);
	router.get('/:id', getByIdHandler);
	router.post('/', validateBody(createPricingSchema), createHandler);
	router.patch('/:id', validateBody(updatePricingSchema), updateHandler);
	router.delete('/:id', deleteHandler);
	router.patch('/:id/toggle', toggleHandler);

	return router;
}
