import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { VehiclesRepository } from './vehicles.repository';
import { VehiclesService } from './vehicles.service';
import { validateBody, validateQuery, getValidatedBody, getValidatedQuery } from '@/worker/core/middleware/validator';
import {
	createVehicleSchema,
	updateVehicleSchema,
	updateStatusSchema,
	listVehiclesQuerySchema,
	availabilityQuerySchema,
	calendarQuerySchema,
	type CreateVehicleRequest,
	type UpdateVehicleRequest,
	type UpdateStatusRequest,
	type ListVehiclesQuery,
	type AvailabilityQuery,
	type CalendarQuery,
} from './vehicles.dto';

// Type for storing services in context
type VehiclesVariables = {
	vehiclesService: VehiclesService;
	user: { userId: string; role: 'SUPER_ADMIN' | 'STAFF' };
};

type VehiclesEnv = { Bindings: Env; Variables: VehiclesVariables };

// Middleware to inject vehicles services into context
export const vehiclesServicesMiddleware = () => async (c: Context<VehiclesEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const vehiclesRepository = new VehiclesRepository(db);
	const vehiclesService = new VehiclesService(vehiclesRepository);

	c.set('vehiclesService', vehiclesService);
	await next();
};

// Route handlers
const listVehiclesHandler = async (c: Context<VehiclesEnv>) => {
	const service = c.get('vehiclesService');
	const query = getValidatedQuery<ListVehiclesQuery>(c);
	const result = await service.list(query);
	return c.json({ success: true, data: result });
};

const getVehicleByIdHandler = async (c: Context<VehiclesEnv>) => {
	const service = c.get('vehiclesService');
	const id = c.req.param('id');
	const result = await service.getById(id);

	if (!result) {
		return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Vehicle not found' } }, 404);
	}

	return c.json({ success: true, data: result });
};

const createVehicleHandler = async (c: Context<VehiclesEnv>) => {
	const service = c.get('vehiclesService');
	const body = getValidatedBody<CreateVehicleRequest>(c);
	const result = await service.create(body);
	return c.json({ success: true, data: result }, 201);
};

const updateVehicleHandler = async (c: Context<VehiclesEnv>) => {
	const service = c.get('vehiclesService');
	const id = c.req.param('id');
	const body = getValidatedBody<UpdateVehicleRequest>(c);
	const result = await service.update(id, body);
	return c.json({ success: true, data: result });
};

const updateStatusHandler = async (c: Context<VehiclesEnv>) => {
	const service = c.get('vehiclesService');
	const user = c.get('user');
	const id = c.req.param('id');
	const body = getValidatedBody<UpdateStatusRequest>(c);
	const result = await service.updateStatus(id, body, user.userId);
	return c.json({ success: true, data: result });
};

const checkAvailabilityHandler = async (c: Context<VehiclesEnv>) => {
	const service = c.get('vehiclesService');
	const query = getValidatedQuery<AvailabilityQuery>(c);
	const result = await service.checkAvailability(query);
	return c.json({ success: true, data: result });
};

const getCalendarHandler = async (c: Context<VehiclesEnv>) => {
	const service = c.get('vehiclesService');
	const id = c.req.param('id');
	const query = getValidatedQuery<CalendarQuery>(c);
	const result = await service.getCalendar(id, query.month);
	return c.json({ success: true, data: result });
};

// Factory function to create vehicles router
export function createVehiclesRouter(): Hono<VehiclesEnv> {
	const router = new Hono<VehiclesEnv>();

	// Apply services middleware to all vehicles routes
	router.use('*', vehiclesServicesMiddleware());

	// All routes require authentication
	router.use('*', authMiddleware());

	// Check availability (public-ish, but requires auth)
	router.get('/availability', validateQuery(availabilityQuerySchema), checkAvailabilityHandler);

	// List vehicles (with pagination and filters)
	router.get('/', validateQuery(listVehiclesQuerySchema), listVehiclesHandler);

	// Get vehicle by ID
	router.get('/:id', getVehicleByIdHandler);

	// Get vehicle calendar
	router.get('/:id/calendar', validateQuery(calendarQuerySchema), getCalendarHandler);

	// Create vehicle
	router.post('/', validateBody(createVehicleSchema), createVehicleHandler);

	// Update vehicle
	router.patch('/:id', validateBody(updateVehicleSchema), updateVehicleHandler);

	// Update vehicle status
	router.patch('/:id/status', validateBody(updateStatusSchema), updateStatusHandler);

	return router;
}
