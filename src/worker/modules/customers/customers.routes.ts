import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { CustomersRepository } from './customers.repository';
import { CustomersService } from './customers.service';
import { validateBody, validateQuery, getValidatedBody, getValidatedQuery } from '@/worker/core/middleware/validator';
import {
	createCustomerSchema,
	updateCustomerSchema,
	setBlacklistSchema,
	listCustomersQuerySchema,
	type CreateCustomerRequest,
	type UpdateCustomerRequest,
	type SetBlacklistRequest,
	type ListCustomersQuery,
} from './customers.dto';

// Type for storing services in context
type CustomersVariables = {
	customersService: CustomersService;
	user: { userId: string; role: 'SUPER_ADMIN' | 'STAFF' };
};

type CustomersEnv = { Bindings: Env; Variables: CustomersVariables };

// Middleware to inject customers services into context
export const customersServicesMiddleware = () => async (c: Context<CustomersEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const customersRepository = new CustomersRepository(db);
	const customersService = new CustomersService(customersRepository);

	c.set('customersService', customersService);
	await next();
};

// Route handlers
const listCustomersHandler = async (c: Context<CustomersEnv>) => {
	const service = c.get('customersService');
	const query = getValidatedQuery<ListCustomersQuery>(c);
	const result = await service.list(query);
	return c.json({ success: true, data: result });
};

const getCustomerByIdHandler = async (c: Context<CustomersEnv>) => {
	const service = c.get('customersService');
	const id = c.req.param('id');
	const result = await service.getById(id);

	if (!result) {
		return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } }, 404);
	}

	return c.json({ success: true, data: result });
};

const getCustomerByPhoneHandler = async (c: Context<CustomersEnv>) => {
	const service = c.get('customersService');
	const phone = c.req.param('phone');
	const result = await service.findByPhone(phone);

	if (!result) {
		return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } }, 404);
	}

	return c.json({ success: true, data: result });
};

const createCustomerHandler = async (c: Context<CustomersEnv>) => {
	const service = c.get('customersService');
	const body = getValidatedBody<CreateCustomerRequest>(c);
	const result = await service.create(body);
	return c.json({ success: true, data: result }, 201);
};

const updateCustomerHandler = async (c: Context<CustomersEnv>) => {
	const service = c.get('customersService');
	const id = c.req.param('id');
	const body = getValidatedBody<UpdateCustomerRequest>(c);
	const result = await service.update(id, body);
	return c.json({ success: true, data: result });
};

const setBlacklistHandler = async (c: Context<CustomersEnv>) => {
	const service = c.get('customersService');
	const id = c.req.param('id');
	const body = getValidatedBody<SetBlacklistRequest>(c);
	const result = await service.setBlacklist(id, body);
	return c.json({ success: true, data: result });
};

// Factory function to create customers router
export function createCustomersRouter(): Hono<CustomersEnv> {
	const router = new Hono<CustomersEnv>();

	// Apply services middleware to all customers routes
	router.use('*', customersServicesMiddleware());

	// All routes require authentication
	router.use('*', authMiddleware());

	// List customers (with pagination and filters)
	router.get('/', validateQuery(listCustomersQuerySchema), listCustomersHandler);

	// Get customer by ID
	router.get('/:id', getCustomerByIdHandler);

	// Get customer by phone (for quick lookup during booking)
	router.get('/by-phone/:phone', getCustomerByPhoneHandler);

	// Create customer
	router.post('/', validateBody(createCustomerSchema), createCustomerHandler);

	// Update customer
	router.patch('/:id', validateBody(updateCustomerSchema), updateCustomerHandler);

	// Set blacklist status
	router.patch('/:id/blacklist', validateBody(setBlacklistSchema), setBlacklistHandler);

	return router;
}
