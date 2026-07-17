import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { LeadsRepository } from './leads.repository';
import { LeadsService } from './leads.service';
import { BookingsRepository } from '../bookings/bookings.repository';
import { VehiclesRepository } from '../vehicles/vehicles.repository';
import { CustomersRepository } from '../customers/customers.repository';
import { validateBody, validateQuery, getValidatedBody, getValidatedQuery } from '@/worker/core/middleware/validator';
import {
	createLeadSchema,
	updateLeadSchema,
	updateLeadStatusSchema,
	addNoteSchema,
	assignLeadSchema,
	convertToBookingSchema,
	listLeadsQuerySchema,
	type CreateLeadRequest,
	type UpdateLeadRequest,
	type UpdateLeadStatusRequest,
	type AddNoteRequest,
	type ConvertToBookingRequest,
	type ListLeadsQuery,
} from './leads.dto';

type LeadsVariables = {
	leadsService: LeadsService;
	user: { userId: string; role: 'SUPER_ADMIN' | 'STAFF' };
};

type LeadsEnv = { Bindings: Env; Variables: LeadsVariables };

export const leadsServicesMiddleware = () => async (c: Context<LeadsEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const leadsRepository = new LeadsRepository(db);
	const bookingsRepository = new BookingsRepository(db);
	const vehiclesRepository = new VehiclesRepository(db);
	const customersRepository = new CustomersRepository(db);
	const leadsService = new LeadsService(
		leadsRepository,
		bookingsRepository,
		vehiclesRepository,
		customersRepository,
	);

	c.set('leadsService', leadsService);
	await next();
};

const listLeadsHandler = async (c: Context<LeadsEnv>) => {
	const service = c.get('leadsService');
	const query = getValidatedQuery<ListLeadsQuery>(c);
	const result = await service.list(query);
	return c.json({ success: true, data: result });
};

const getLeadByIdHandler = async (c: Context<LeadsEnv>) => {
	const service = c.get('leadsService');
	const id = c.req.param('id');
	const result = await service.getById(id);

	if (!result) {
		return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } }, 404);
	}

	return c.json({ success: true, data: result });
};

const createLeadHandler = async (c: Context<LeadsEnv>) => {
	const service = c.get('leadsService');
	const body = getValidatedBody<CreateLeadRequest>(c);
	const result = await service.create(body);
	return c.json({ success: true, data: result }, 201);
};

const updateLeadHandler = async (c: Context<LeadsEnv>) => {
	const service = c.get('leadsService');
	const id = c.req.param('id');
	const body = getValidatedBody<UpdateLeadRequest>(c);
	const result = await service.update(id, body);
	return c.json({ success: true, data: result });
};

const deleteLeadHandler = async (c: Context<LeadsEnv>) => {
	const service = c.get('leadsService');
	const id = c.req.param('id');
	await service.delete(id);
	return c.json({ success: true, data: null });
};

const updateStatusHandler = async (c: Context<LeadsEnv>) => {
	const service = c.get('leadsService');
	const id = c.req.param('id');
	const body = getValidatedBody<UpdateLeadStatusRequest>(c);
	const result = await service.updateStatus(id, body);
	return c.json({ success: true, data: result });
};

const addNoteHandler = async (c: Context<LeadsEnv>) => {
	const service = c.get('leadsService');
	const id = c.req.param('id');
	const body = getValidatedBody<AddNoteRequest>(c);
	const result = await service.addNote(id, body);
	return c.json({ success: true, data: result });
};

const assignLeadHandler = async (c: Context<LeadsEnv>) => {
	const service = c.get('leadsService');
	const id = c.req.param('id');
	const body = getValidatedBody<{ userId: string }>(c);
	const result = await service.assignToUser(id, body.userId ?? null);
	return c.json({ success: true, data: result });
};

const getStatsHandler = async (c: Context<LeadsEnv>) => {
	const service = c.get('leadsService');
	const result = await service.getStats();
	return c.json({ success: true, data: result });
};

const convertToBookingHandler = async (c: Context<LeadsEnv>) => {
	const service = c.get('leadsService');
	const id = c.req.param('id');
	const body = getValidatedBody<ConvertToBookingRequest>(c);
	const user = c.get('user');
	const result = await service.convertToBooking(id, body, user.userId);
	return c.json({ success: true, data: result }, 201);
};

export function createLeadsRouter(): Hono<LeadsEnv> {
	const router = new Hono<LeadsEnv>();

	router.use('*', leadsServicesMiddleware());
	router.use('*', authMiddleware());

	router.get('/stats', getStatsHandler);
	router.get('/', validateQuery(listLeadsQuerySchema), listLeadsHandler);
	router.get('/:id', getLeadByIdHandler);
	router.post('/', validateBody(createLeadSchema), createLeadHandler);
	router.patch('/:id', validateBody(updateLeadSchema), updateLeadHandler);
	router.delete('/:id', deleteLeadHandler);
	router.patch('/:id/status', validateBody(updateLeadStatusSchema), updateStatusHandler);
	router.post('/:id/notes', validateBody(addNoteSchema), addNoteHandler);
	router.post('/:id/assign', validateBody(assignLeadSchema), assignLeadHandler);
	router.post('/:id/convert', validateBody(convertToBookingSchema), convertToBookingHandler);

	return router;
}