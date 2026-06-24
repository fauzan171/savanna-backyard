import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { VehiclesRepository } from './vehicles.repository';
import { VehiclesService } from './vehicles.service';
import { BookingsRepository } from '../bookings/bookings.repository';
import { MaintenanceRepository } from '../maintenance/maintenance.repository';
import { validateBody, validateQuery, getValidatedBody, getValidatedQuery } from '@/worker/core/middleware/validator';
import {
	createVehicleSchema,
	updateVehicleSchema,
	updateStatusSchema,
	listVehiclesQuerySchema,
	availabilityQuerySchema,
	calendarQuerySchema,
	calendarMatrixQuerySchema,
	type CreateVehicleRequest,
	type UpdateVehicleRequest,
	type UpdateStatusRequest,
	type ListVehiclesQuery,
	type AvailabilityQuery,
	type CalendarQuery,
	type CalendarMatrixQuery,
} from './vehicles.dto';

type VehiclesVariables = {
	vehiclesService: VehiclesService;
	user: { userId: string; role: 'SUPER_ADMIN' | 'STAFF' };
};

type VehiclesEnv = { Bindings: Env; Variables: VehiclesVariables };

export const vehiclesServicesMiddleware = () => async (c: Context<VehiclesEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const vehiclesRepository = new VehiclesRepository(db);
	const bookingsRepository = new BookingsRepository(db);
	const maintenanceRepository = new MaintenanceRepository(db);
	const vehiclesService = new VehiclesService(
		vehiclesRepository,
		bookingsRepository,
		maintenanceRepository,
	);

	c.set('vehiclesService', vehiclesService);
	await next();
};

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

const getCalendarMatrixHandler = async (c: Context<VehiclesEnv>) => {
	const service = c.get('vehiclesService');
	const query = getValidatedQuery<CalendarMatrixQuery>(c);
	const result = await service.getCalendarMatrix(query);
	return c.json({ success: true, data: result });
};

export function createVehiclesRouter(): Hono<VehiclesEnv> {
	const router = new Hono<VehiclesEnv>();

	router.use('*', vehiclesServicesMiddleware());
	router.use('*', authMiddleware());

	router.get('/availability', validateQuery(availabilityQuerySchema), checkAvailabilityHandler);
	router.get('/calendar', validateQuery(calendarMatrixQuerySchema), getCalendarMatrixHandler);
	router.get('/', validateQuery(listVehiclesQuerySchema), listVehiclesHandler);
	router.get('/:id', getVehicleByIdHandler);
	router.get('/:id/calendar', validateQuery(calendarQuerySchema), getCalendarHandler);
	router.post('/', validateBody(createVehicleSchema), createVehicleHandler);
	router.patch('/:id', validateBody(updateVehicleSchema), updateVehicleHandler);
	router.patch('/:id/status', validateBody(updateStatusSchema), updateStatusHandler);

	return router;
}