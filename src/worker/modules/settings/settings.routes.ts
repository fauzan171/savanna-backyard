import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { validateBody, getValidatedBody } from '@/worker/core/middleware/validator';
import { SettingsService } from './settings.service';
import {
	bulkUpdateSettingsSchema,
	updateByKeySchema,
	type BulkUpdateSettingsRequest,
	type UpdateByKeyRequest,
} from './settings.dto';

type SettingsVariables = {
	settingsService: SettingsService;
	user: { userId: string; role: 'SUPER_ADMIN' | 'STAFF' };
};

type SettingsEnv = { Bindings: Env; Variables: SettingsVariables };

const settingsServicesMiddleware = () => async (c: Context<SettingsEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const configRepository = new ConfigRepository(db);
	const settingsService = new SettingsService(configRepository);
	c.set('settingsService', settingsService);
	await next();
};

const listHandler = async (c: Context<SettingsEnv>) => {
	const service = c.get('settingsService');
	const result = await service.list();
	return c.json({ success: true, data: result });
};

const getByKeyHandler = async (c: Context<SettingsEnv>) => {
	const service = c.get('settingsService');
	const key = c.req.param('key');
	const result = await service.getByKey(key);
	if (!result) {
		return c.json({ success: false, message: 'Setting not found', error: { code: 'NOT_FOUND', message: 'Setting not found' } }, 404);
	}
	return c.json({ success: true, data: result });
};

const bulkUpdateHandler = async (c: Context<SettingsEnv>) => {
	const user = c.get('user');
	if (user.role !== 'SUPER_ADMIN') {
		return c.json({ success: false, message: 'Forbidden', error: { code: 'FORBIDDEN', message: 'SUPER_ADMIN only' } }, 403);
	}
	const service = c.get('settingsService');
	const body = getValidatedBody<BulkUpdateSettingsRequest>(c);
	const result = await service.bulkUpdate(body.settings, user.userId);
	return c.json({ success: true, data: result });
};

const updateByKeyHandler = async (c: Context<SettingsEnv>) => {
	const user = c.get('user');
	if (user.role !== 'SUPER_ADMIN') {
		return c.json({ success: false, message: 'Forbidden', error: { code: 'FORBIDDEN', message: 'SUPER_ADMIN only' } }, 403);
	}
	const service = c.get('settingsService');
	const key = c.req.param('key');
	const body = getValidatedBody<UpdateByKeyRequest>(c);
	// Re-validate the single key against per-key semantics (SET-02, SET-03).
	// The body schema only checks the value is a string; key-specific rules
	// are enforced by the service via settingItemSchema.
	const result = await service.update(key, body.value, user.userId);
	return c.json({ success: true, data: result });
};

export function createSettingsRouter(): Hono<SettingsEnv> {
	const router = new Hono<SettingsEnv>();
	router.use('*', settingsServicesMiddleware());
	router.use('*', authMiddleware());

	router.get('/', listHandler);
	router.patch('/', validateBody(bulkUpdateSettingsSchema), bulkUpdateHandler);
	router.get('/:key', getByKeyHandler);
	router.patch('/:key', validateBody(updateByKeySchema), updateByKeyHandler);

	return router;
}
