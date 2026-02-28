import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { LeadsRepository } from './leads.repository';
import { LeadsService } from './leads.service';
import { validateBody, validateQuery, getValidatedBody, getValidatedQuery } from '@/worker/core/middleware/validator';
import {
	createLeadSchema,
	updateLeadSchema,
	updateLeadStatusSchema,
	addNoteSchema,
	listLeadsQuerySchema,
	type CreateLeadRequest,
	type UpdateLeadRequest,
	type UpdateLeadStatusRequest,
	type AddNoteRequest,
	type ListLeadsQuery,
} from './leads.dto';

// Type for storing services in context
type LeadsVariables = {
	leadsService: LeadsService;
	user: { userId: string; role: 'SUPER_ADMIN' | 'STAFF' };
};

type LeadsEnv = { Bindings: Env; Variables: LeadsVariables };

// Middleware to inject leads services into context
export const leadsServicesMiddleware = () => async (c: Context<LeadsEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const leadsRepository = new LeadsRepository(db);
	const leadsService = new LeadsService(leadsRepository);

	c.set('leadsService', leadsService);
	await next();
};

// Route handlers
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
	const { userId } = await c.req.json();
	const result = await service.assignToUser(id, userId ?? null);
	return c.json({ success: true, data: result });
};

const getStatsHandler = async (c: Context<LeadsEnv>) => {
	const service = c.get('leadsService');
	const result = await service.getStats();
	return c.json({ success: true, data: result });
};

// Factory function to create leads router
export function createLeadsRouter(): Hono<LeadsEnv> {
	const router = new Hono<LeadsEnv>();

	// Apply services middleware to all leads routes
	router.use('*', leadsServicesMiddleware());

	// All routes require authentication
	router.use('*', authMiddleware());

	// Get lead statistics
	router.get('/stats', getStatsHandler);

	// List leads (with pagination and filters)
	router.get('/', validateQuery(listLeadsQuerySchema), listLeadsHandler);

	// Get lead by ID
	router.get('/:id', getLeadByIdHandler);

	// Create lead
	router.post('/', validateBody(createLeadSchema), createLeadHandler);

	// Update lead
	router.patch('/:id', validateBody(updateLeadSchema), updateLeadHandler);

	// Update lead status
	router.patch('/:id/status', validateBody(updateLeadStatusSchema), updateStatusHandler);

	// Add note to lead
	router.post('/:id/notes', validateBody(addNoteSchema), addNoteHandler);

	// Assign lead to user
	router.post('/:id/assign', assignLeadHandler);

	return router;
}
