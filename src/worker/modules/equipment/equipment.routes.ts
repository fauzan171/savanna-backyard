import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { validateBody, getValidatedBody } from '@/worker/core/middleware/validator';
import { EquipmentRepository } from './equipment.repository';
import { EquipmentService } from './equipment.service';
import { createEquipmentSchema, updateEquipmentSchema, type CreateEquipmentRequest, type UpdateEquipmentRequest } from './equipment.dto';

type EquipmentVariables = { equipmentService: EquipmentService };
type EquipmentEnv = { Bindings: Env; Variables: EquipmentVariables };

const equipmentServicesMiddleware = () => async (c: Context<EquipmentEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	c.set('equipmentService', new EquipmentService(new EquipmentRepository(db)));
	await next();
};

const listHandler = async (c: Context<EquipmentEnv>) => {
	const service = c.get('equipmentService');
	const activeOnly = c.req.query('active') === 'true';
	const items = await service.list(activeOnly);
	return c.json({ success: true, data: items });
};

const getByIdHandler = async (c: Context<EquipmentEnv>) => {
	const service = c.get('equipmentService');
	const item = await service.getById(c.req.param('id'));
	return c.json({ success: true, data: item });
};

const createHandler = async (c: Context<EquipmentEnv>) => {
	const service = c.get('equipmentService');
	const body = getValidatedBody<CreateEquipmentRequest>(c);
	const item = await service.create(body);
	return c.json({ success: true, message: 'Equipment created', data: item }, 201);
};

const updateHandler = async (c: Context<EquipmentEnv>) => {
	const service = c.get('equipmentService');
	const body = getValidatedBody<UpdateEquipmentRequest>(c);
	const item = await service.update(c.req.param('id'), body);
	return c.json({ success: true, data: item });
};

const deleteHandler = async (c: Context<EquipmentEnv>) => {
	const service = c.get('equipmentService');
	await service.delete(c.req.param('id'));
	return c.json({ success: true, message: 'Equipment deleted' });
};

// Admin equipment CRUD (auth required). Public read endpoints live in the public-api router.
export function createEquipmentRouter(): Hono<EquipmentEnv> {
	const router = new Hono<EquipmentEnv>();
	router.use('*', equipmentServicesMiddleware());
	router.use('*', authMiddleware());

	router.get('/', listHandler);
	router.get('/:id', getByIdHandler);
	router.post('/', validateBody(createEquipmentSchema), createHandler);
	router.patch('/:id', validateBody(updateEquipmentSchema), updateHandler);
	router.delete('/:id', deleteHandler);

	return router;
}
