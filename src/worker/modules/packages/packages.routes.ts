import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { PackagesRepository } from './packages.repository';
import { PackagesService } from './packages.service';
import { validateBody, getValidatedBody } from '@/worker/core/middleware/validator';
import { createPackageSchema, updatePackageSchema, type CreatePackageRequest, type UpdatePackageRequest } from './packages.dto';

type PackagesVariables = {
	packagesService: PackagesService;
	user: { userId: string; role: 'SUPER_ADMIN' | 'STAFF' };
};

type PackagesEnv = { Bindings: Env; Variables: PackagesVariables };

const packagesServicesMiddleware = () => async (c: Context<PackagesEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const packagesRepository = new PackagesRepository(db);
	const packagesService = new PackagesService(packagesRepository);
	c.set('packagesService', packagesService);
	await next();
};

const requireSuperAdmin = (c: Context<PackagesEnv>) => {
	const user = c.get('user');
	if (user.role !== 'SUPER_ADMIN') {
		return c.json({ success: false, message: 'Forbidden', error: { code: 'FORBIDDEN', message: 'SUPER_ADMIN only' } }, 403);
	}
	return null;
};

const listHandler = async (c: Context<PackagesEnv>) => {
	const service = c.get('packagesService');
	const result = await service.list();
	return c.json({ success: true, data: result });
};

const getByIdHandler = async (c: Context<PackagesEnv>) => {
	const service = c.get('packagesService');
	const id = c.req.param('id');
	const result = await service.getById(id);
	return c.json({ success: true, data: result });
};

const createHandler = async (c: Context<PackagesEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('packagesService');
	const body = getValidatedBody<CreatePackageRequest>(c);
	const result = await service.create(body);
	return c.json({ success: true, message: 'Package created', data: result }, 201);
};

const updateHandler = async (c: Context<PackagesEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('packagesService');
	const id = c.req.param('id');
	const body = getValidatedBody<UpdatePackageRequest>(c);
	const result = await service.update(id, body);
	return c.json({ success: true, data: result });
};

const deleteHandler = async (c: Context<PackagesEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('packagesService');
	const id = c.req.param('id');
	await service.delete(id);
	return c.json({ success: true, message: 'Package deleted' });
};

const toggleHandler = async (c: Context<PackagesEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('packagesService');
	const id = c.req.param('id');
	const result = await service.toggle(id);
	return c.json({ success: true, data: result });
};

export function createPackagesRouter(): Hono<PackagesEnv> {
	const router = new Hono<PackagesEnv>();
	router.use('*', packagesServicesMiddleware());
	router.use('*', authMiddleware());

	router.get('/', listHandler);
	router.get('/:id', getByIdHandler);
	router.post('/', validateBody(createPackageSchema), createHandler);
	router.patch('/:id', validateBody(updatePackageSchema), updateHandler);
	router.delete('/:id', deleteHandler);
	router.patch('/:id/toggle', toggleHandler);

	return router;
}
