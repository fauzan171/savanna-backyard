import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { MaintenanceRepository } from './maintenance.repository';
import { VehiclesRepository } from '../vehicles/vehicles.repository';
import { BookingsRepository } from '../bookings/bookings.repository';
import { UserRepository } from '../auth/auth.repository';
import { MaintenanceService } from './maintenance.service';
import { validateBody, validateQuery, getValidatedBody, getValidatedQuery } from '@/worker/core/middleware/validator';
import {
	createMaintenanceSchema,
	updateMaintenanceSchema,
	completeMaintenanceSchema,
	listMaintenanceQuerySchema,
	vehicleHistoryQuerySchema,
	upcomingQuerySchema,
	type CreateMaintenanceRequest,
	type UpdateMaintenanceRequest,
	type CompleteMaintenanceRequest,
	type ListMaintenanceQuery,
	type VehicleHistoryQuery,
	type UpcomingQuery,
} from './maintenance.dto';

// Type for storing services in context
type MaintenanceVariables = {
	maintenanceService: MaintenanceService;
	user: { userId: string; role: 'SUPER_ADMIN' | 'STAFF' };
};

type MaintenanceEnv = { Bindings: Env; Variables: MaintenanceVariables };

// Middleware to inject maintenance services into context
export const maintenanceServicesMiddleware = () => async (c: Context<MaintenanceEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const maintenanceRepository = new MaintenanceRepository(db);
	const vehiclesRepository = new VehiclesRepository(db);
	const bookingsRepository = new BookingsRepository(db);
	const usersRepository = new UserRepository(db);
	const maintenanceService = new MaintenanceService(
		maintenanceRepository,
		vehiclesRepository,
		bookingsRepository,
		usersRepository
	);

	c.set('maintenanceService', maintenanceService);
	await next();
};

// Route handlers
const listMaintenanceHandler = async (c: Context<MaintenanceEnv>) => {
	const service = c.get('maintenanceService');
	const query = getValidatedQuery<ListMaintenanceQuery>(c);
	const result = await service.list(query);
	return c.json({ success: true, data: result });
};

const getMaintenanceByIdHandler = async (c: Context<MaintenanceEnv>) => {
	const service = c.get('maintenanceService');
	const id = c.req.param('id');
	const result = await service.getById(id);

	if (!result) {
		return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Maintenance record not found' } }, 404);
	}

	return c.json({ success: true, data: result });
};

const createMaintenanceHandler = async (c: Context<MaintenanceEnv>) => {
	const service = c.get('maintenanceService');
	const user = c.get('user');
	const body = getValidatedBody<CreateMaintenanceRequest>(c);
	const result = await service.create(body, user.userId);
	return c.json({ success: true, data: result }, 201);
};

const updateMaintenanceHandler = async (c: Context<MaintenanceEnv>) => {
	const service = c.get('maintenanceService');
	const id = c.req.param('id');
	const body = getValidatedBody<UpdateMaintenanceRequest>(c);
	const result = await service.update(id, body);
	return c.json({ success: true, data: result });
};

const startMaintenanceHandler = async (c: Context<MaintenanceEnv>) => {
	const service = c.get('maintenanceService');
	const user = c.get('user');
	const id = c.req.param('id');
	const result = await service.start(id, user.userId);
	return c.json({ success: true, data: result });
};

const completeMaintenanceHandler = async (c: Context<MaintenanceEnv>) => {
	const service = c.get('maintenanceService');
	const user = c.get('user');
	const id = c.req.param('id');
	const body = getValidatedBody<CompleteMaintenanceRequest>(c);
	const result = await service.complete(id, body, user.userId);
	return c.json({ success: true, data: result });
};

const getVehicleHistoryHandler = async (c: Context<MaintenanceEnv>) => {
	const service = c.get('maintenanceService');
	const vehicleId = c.req.param('vehicleId');
	const query = getValidatedQuery<VehicleHistoryQuery>(c);
	const result = await service.getVehicleHistory(vehicleId, query);
	return c.json({ success: true, data: result });
};

const getVehicleSummaryHandler = async (c: Context<MaintenanceEnv>) => {
	const service = c.get('maintenanceService');
	const vehicleId = c.req.param('vehicleId');
	const result = await service.getVehicleMaintenanceSummary(vehicleId);
	return c.json({ success: true, data: result });
};

const getUpcomingHandler = async (c: Context<MaintenanceEnv>) => {
	const service = c.get('maintenanceService');
	const query = getValidatedQuery<UpcomingQuery>(c);
	const result = await service.getUpcoming(query);
	return c.json({ success: true, data: result });
};

// Factory function to create maintenance router
export function createMaintenanceRouter(): Hono<MaintenanceEnv> {
	const router = new Hono<MaintenanceEnv>();

	// Apply services middleware to all maintenance routes
	router.use('*', maintenanceServicesMiddleware());

	// All routes require authentication
	router.use('*', authMiddleware());

	// List maintenance records (with pagination and filters)
	router.get('/', validateQuery(listMaintenanceQuerySchema), listMaintenanceHandler);

	// Get upcoming maintenance (scheduled, in-progress, overdue)
	router.get('/upcoming', validateQuery(upcomingQuerySchema), getUpcomingHandler);

	// Get maintenance by ID
	router.get('/:id', getMaintenanceByIdHandler);

	// Create maintenance record
	router.post('/', validateBody(createMaintenanceSchema), createMaintenanceHandler);

	// Update maintenance record
	router.patch('/:id', validateBody(updateMaintenanceSchema), updateMaintenanceHandler);

	// Start maintenance (transition from Scheduled to InProgress)
	router.post('/:id/start', startMaintenanceHandler);

	// Complete maintenance (transition from InProgress to Completed)
	router.post('/:id/complete', validateBody(completeMaintenanceSchema), completeMaintenanceHandler);

	// Get vehicle maintenance history (mounted on /vehicles/:vehicleId/maintenance)
	router.get('/vehicles/:vehicleId/history', validateQuery(vehicleHistoryQuerySchema), getVehicleHistoryHandler);

	// Get vehicle maintenance summary
	router.get('/vehicles/:vehicleId/summary', getVehicleSummaryHandler);

	return router;
}
