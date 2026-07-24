import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { validateBody, getValidatedBody } from '@/worker/core/middleware/validator';
import { createUserSchema, updateUserSchema, changePasswordSchema, type CreateUserRequest, type UpdateUserRequest, type ChangePasswordRequest } from './users.dto';

type UsersVariables = {
	usersService: UsersService;
	user: { userId: string; role: 'SUPER_ADMIN' | 'STAFF' };
};

type UsersEnv = { Bindings: Env; Variables: UsersVariables };

const usersServicesMiddleware = () => async (c: Context<UsersEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const usersRepository = new UsersRepository(db);
	const usersService = new UsersService(usersRepository);
	c.set('usersService', usersService);
	await next();
};

const requireSuperAdmin = (c: Context<UsersEnv>) => {
	const user = c.get('user');
	if (user.role !== 'SUPER_ADMIN') {
		return c.json({ success: false, message: 'Forbidden', error: { code: 'FORBIDDEN', message: 'SUPER_ADMIN only' } }, 403);
	}
	return null;
};

const listHandler = async (c: Context<UsersEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('usersService');
	const result = await service.list();
	return c.json({ success: true, data: result });
};

const createHandler = async (c: Context<UsersEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('usersService');
	const body = getValidatedBody<CreateUserRequest>(c);
	const result = await service.create(body);
	return c.json({ success: true, message: 'User created', data: result }, 201);
};

const updateHandler = async (c: Context<UsersEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('usersService');
	const id = c.req.param('id');
	const body = getValidatedBody<UpdateUserRequest>(c);
	const result = await service.update(id, body);
	return c.json({ success: true, data: result });
};

const toggleHandler = async (c: Context<UsersEnv>) => {
	const forbidden = requireSuperAdmin(c);
	if (forbidden) return forbidden;
	const service = c.get('usersService');
	const id = c.req.param('id');
	const result = await service.toggle(id);
	return c.json({ success: true, data: result });
};

const changePasswordHandler = async (c: Context<UsersEnv>) => {
	const service = c.get('usersService');
	const user = c.get('user');
	const id = c.req.param('id');

	// User can only change their own password (unless SUPER_ADMIN)
	if (user.role !== 'SUPER_ADMIN' && user.userId !== id) {
		return c.json({ success: false, message: 'Forbidden', error: { code: 'FORBIDDEN', message: 'Can only change your own password' } }, 403);
	}

	const body = getValidatedBody<ChangePasswordRequest>(c);
	// BUG#11: SUPER_ADMIN resetting ANOTHER user's password doesn't need the
	// current password (they don't know it). Self-changes always require it.
	const isAdminReset = user.role === 'SUPER_ADMIN' && user.userId !== id;
	const result = isAdminReset
		? await service.adminResetPassword(id, body.newPassword)
		: await service.changePassword(id, body.currentPassword, body.newPassword);
	return c.json({ success: true, data: result });
};

export function createUsersRouter(): Hono<UsersEnv> {
	const router = new Hono<UsersEnv>();
	router.use('*', usersServicesMiddleware());
	router.use('*', authMiddleware());

	router.get('/', listHandler);
	router.post('/', validateBody(createUserSchema), createHandler);
	router.patch('/:id', validateBody(updateUserSchema), updateHandler);
	router.patch('/:id/toggle', toggleHandler);
	router.patch('/:id/password', validateBody(changePasswordSchema), changePasswordHandler);

	return router;
}
