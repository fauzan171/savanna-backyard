import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { ChecklistsRepository } from './checklists.repository';
import { ChecklistsService } from './checklists.service';
import { BookingsRepository } from '../bookings/bookings.repository';
import { validateBody, getValidatedBody } from '@/worker/core/middleware/validator';
import { createChecklistSchema, updateChecklistSchema, type CreateChecklistRequest, type UpdateChecklistRequest } from './checklists.dto';

type ChecklistsVariables = {
	checklistsService: ChecklistsService;
	user: { userId: string; role: 'SUPER_ADMIN' | 'STAFF' };
};

type ChecklistsEnv = { Bindings: Env; Variables: ChecklistsVariables };

const checklistsServicesMiddleware = () => async (c: Context<ChecklistsEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const checklistsRepository = new ChecklistsRepository(db);
	const bookingsRepository = new BookingsRepository(db);
	const checklistsService = new ChecklistsService(checklistsRepository, bookingsRepository);
	c.set('checklistsService', checklistsService);
	await next();
};

const createHandler = async (c: Context<ChecklistsEnv>) => {
	const service = c.get('checklistsService');
	const user = c.get('user');
	const body = getValidatedBody<CreateChecklistRequest>(c);
	const result = await service.create(user.userId, body);
	return c.json({ success: true, data: result }, 201);
};

const getByBookingHandler = async (c: Context<ChecklistsEnv>) => {
	const service = c.get('checklistsService');
	const bookingId = c.req.param('bookingId');
	const result = await service.getByBookingId(bookingId);
	return c.json({ success: true, data: result });
};

const getByIdHandler = async (c: Context<ChecklistsEnv>) => {
	const service = c.get('checklistsService');
	const id = c.req.param('id');
	const result = await service.getById(id);
	return c.json({ success: true, data: result });
};

const updateHandler = async (c: Context<ChecklistsEnv>) => {
	const service = c.get('checklistsService');
	const id = c.req.param('id');
	const body = getValidatedBody<UpdateChecklistRequest>(c);
	const result = await service.update(id, body);
	return c.json({ success: true, data: result });
};

export function createChecklistsRouter(): Hono<ChecklistsEnv> {
	const router = new Hono<ChecklistsEnv>();
	router.use('*', checklistsServicesMiddleware());
	router.use('*', authMiddleware());

	router.post('/', validateBody(createChecklistSchema), createHandler);
	router.get('/booking/:bookingId', getByBookingHandler);
	router.get('/:id', getByIdHandler);
	router.patch('/:id', validateBody(updateChecklistSchema), updateHandler);

	return router;
}
