import { Hono, Context } from 'hono';
import { createDb } from '@/worker/core/database';
import { PublicApiRepository } from './public-api.repository';
import { PublicApiService } from './public-api.service';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { apiKeyMiddleware } from '@/worker/core/middleware/api-key';
import { validateBody, validateQuery, getValidatedBody, getValidatedQuery } from '@/worker/core/middleware/validator';
import { cors } from 'hono/cors';
import {
	submitLeadSchema,
	checkAvailabilityQuerySchema,
	getVehicleTypesQuerySchema,
	createPublicBookingSchema,
	type SubmitLeadRequest,
	type CheckAvailabilityQuery,
	type CreatePublicBookingRequest,
} from './public-api.dto';

type PublicApiVariables = { publicApiService: PublicApiService };
type PublicApiEnv = { Bindings: Env; Variables: PublicApiVariables };

export const publicApiServicesMiddleware = () => async (c: Context<PublicApiEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const publicApiRepository = new PublicApiRepository(db);
	const configRepository = new ConfigRepository(db);
	const publicApiService = new PublicApiService(publicApiRepository, configRepository);
	c.set('publicApiService', publicApiService);
	await next();
};

// Route handlers
const submitLeadHandler = async (c: Context<PublicApiEnv>) => {
	const service = c.get('publicApiService');
	const body = getValidatedBody<SubmitLeadRequest>(c);
	const result = await service.submitLead(body);
	return c.json({ success: true, message: 'Lead submitted successfully', data: result }, 201);
};

const checkAvailabilityHandler = async (c: Context<PublicApiEnv>) => {
	const service = c.get('publicApiService');
	const query = getValidatedQuery<CheckAvailabilityQuery>(c);
	const result = await service.checkAvailability(query);
	return c.json({ success: true, data: result });
};

const getVehicleTypesHandler = async (c: Context<PublicApiEnv>) => {
	const service = c.get('publicApiService');
	const result = await service.getVehicleTypes();
	return c.json({ success: true, data: result });
};

const getVehicleDetailsHandler = async (c: Context<PublicApiEnv>) => {
	const service = c.get('publicApiService');
	const id = c.req.param('id');
	const result = await service.getVehicleDetails(id);
	if (!result) {
		return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Vehicle not found' } }, 404);
	}
	return c.json({ success: true, data: result });
};

const createBookingHandler = async (c: Context<PublicApiEnv>) => {
	const service = c.get('publicApiService');
	const body = getValidatedBody<CreatePublicBookingRequest>(c);
	const midtransServerKey = c.env.MIDTRANS_SERVER_KEY ?? '';

	const result = await service.createPublicBooking(body, midtransServerKey);

	return c.json({
		success: true,
		message: 'Booking created successfully',
		data: result,
	}, 201);
};

export function createPublicApiRouter(): Hono<PublicApiEnv> {
	const router = new Hono<PublicApiEnv>();

	router.use('*', publicApiServicesMiddleware());

	router.use('*', cors({
		origin: (origin, c) => {
			const allowedOrigins = c.env.ALLOWED_PUBLIC_API_ORIGINS?.split(',').map((o: string) => o.trim()) ?? [];
			if (origin && allowedOrigins.includes(origin)) return origin;
			if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) return origin;
			return allowedOrigins[0] ?? null;
		},
		credentials: false,
		allowMethods: ['GET', 'POST', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'X-API-Key'],
	}));

	router.use('*', apiKeyMiddleware());

	// Existing routes
	router.post('/leads', validateBody(submitLeadSchema), submitLeadHandler);
	router.get('/availability', validateQuery(checkAvailabilityQuerySchema), checkAvailabilityHandler);
	router.get('/vehicle-types', validateQuery(getVehicleTypesQuerySchema), getVehicleTypesHandler);
	router.get('/vehicles/:id', getVehicleDetailsHandler);

	// New: public booking endpoint
	router.post('/bookings', validateBody(createPublicBookingSchema), createBookingHandler);

	return router;
}