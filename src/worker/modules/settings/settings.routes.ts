import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { SettingsService } from './settings.service';
import { validateSettingValue } from './settings.dto';

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
	let body: any;
	try {
		body = JSON.parse(await c.req.text());
	} catch {
		return c.json({ success: false, message: 'Invalid JSON', error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } }, 400);
	}
	if (!body.settings || !Array.isArray(body.settings)) {
		return c.json({ success: false, message: 'Invalid input', error: { code: 'VALIDATION_ERROR', message: 'settings array required' } }, 400);
	}
	// Validate each setting value per-key before persisting
	const normalized: { key: string; value: string }[] = [];
	for (const item of body.settings) {
		if (!item || typeof item.key !== 'string' || item.value == null) {
			return c.json({ success: false, message: 'Invalid input', error: { code: 'VALIDATION_ERROR', message: 'each setting needs { key, value }' } }, 400);
		}
		try {
			normalized.push({ key: item.key, value: validateSettingValue(item.key, item.value) });
		} catch (err) {
			const message = (err as Error).message;
			return c.json({ success: false, message, error: { code: 'VALIDATION_ERROR', message } }, 400);
		}
	}
	const result = await service.bulkUpdate(normalized, user.userId);
	return c.json({ success: true, data: result });
};

const updateByKeyHandler = async (c: Context<SettingsEnv>) => {
	const user = c.get('user');
	if (user.role !== 'SUPER_ADMIN') {
		return c.json({ success: false, message: 'Forbidden', error: { code: 'FORBIDDEN', message: 'SUPER_ADMIN only' } }, 403);
	}
	const service = c.get('settingsService');
	const key = c.req.param('key');
	let body: any;
	try {
		body = JSON.parse(await c.req.text());
	} catch {
		return c.json({ success: false, message: 'Invalid JSON', error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } }, 400);
	}
	if (body.value == null || body.value === '') {
		return c.json({ success: false, message: 'Invalid input', error: { code: 'VALIDATION_ERROR', message: 'value is required' } }, 400);
	}
	let normalized: string;
	try {
		normalized = validateSettingValue(key, body.value);
	} catch (err) {
		const message = (err as Error).message;
		return c.json({ success: false, message, error: { code: 'VALIDATION_ERROR', message } }, 400);
	}
	const result = await service.update(key, normalized, user.userId);
	return c.json({ success: true, data: result });
};

export function createSettingsRouter(): Hono<SettingsEnv> {
	const router = new Hono<SettingsEnv>();
	router.use('*', settingsServicesMiddleware());
	router.use('*', authMiddleware());

	router.get('/', listHandler);
	router.patch('/', bulkUpdateHandler);
	router.get('/:key', getByKeyHandler);
	router.patch('/:key', updateByKeyHandler);

	return router;
}
