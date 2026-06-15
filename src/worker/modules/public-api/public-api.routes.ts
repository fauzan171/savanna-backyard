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
	getPublicReviewsQuerySchema,
	type SubmitLeadRequest,
	type CheckAvailabilityQuery,
	type CreatePublicBookingRequest,
	type GetPublicReviewsQuery,
} from './public-api.dto';

type PublicApiVariables = { publicApiService: PublicApiService };
type PublicApiEnv = { Bindings: Env; Variables: PublicApiVariables };

export const publicApiServicesMiddleware = () => async (c: Context<PublicApiEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const publicApiRepository = new PublicApiRepository(db);
	const configRepository = new ConfigRepository(db);
	// Derive the API origin (scheme + host) so the service can resolve relative
	// upload paths into absolute URLs for cross-origin clients (landing page).
	const baseUrl = new URL(c.req.url).origin;
	const publicApiService = new PublicApiService(publicApiRepository, configRepository, baseUrl);
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

	const ifortepayConfig = {
		merchantId: c.env.IFORTEPAY_MERCHANT_ID ?? '',
		secretUnboundId: c.env.IFORTEPAY_SECRET_UNBOUND_ID ?? '',
		hashKey: c.env.IFORTEPAY_HASH_KEY ?? '',
		isProduction: c.env.ENVIRONMENT === 'production',
		callbackUrl: c.env.IFORTEPAY_CALLBACK_URL ?? '',
		successRedirectUrl: c.env.IFORTEPAY_SUCCESS_REDIRECT_URL ?? '',
		failedRedirectUrl: c.env.IFORTEPAY_FAILED_REDIRECT_URL ?? '',
	};

	const result = await service.createPublicBooking(body, ifortepayConfig);

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

	// ===== FASE 2 ROUTES =====

	// Get public vehicles
	router.get('/vehicles', async (c: Context<PublicApiEnv>) => {
		const service = c.get('publicApiService');
		const result = await service.getPublicVehicles();
		return c.json({ success: true, data: result });
	});

	// Get public packages
	router.get('/packages', async (c: Context<PublicApiEnv>) => {
		const service = c.get('publicApiService');
		const result = await service.getPublicPackages();
		return c.json({ success: true, data: result });
	});

	// Get public pricing
	router.get('/pricing', async (c: Context<PublicApiEnv>) => {
		const service = c.get('publicApiService');
		const result = await service.getPublicPricing();
		return c.json({ success: true, data: result });
	});

	// Get public reviews
	router.get('/reviews', validateQuery(getPublicReviewsQuerySchema), async (c: Context<PublicApiEnv>) => {
		const service = c.get('publicApiService');
		const query = getValidatedQuery<GetPublicReviewsQuery>(c);
		const result = await service.getPublicReviews(query);
		return c.json({ success: true, data: result.data, meta: result.meta });
	});

	// Get public trails (list)
	router.get('/trails', async (c: Context<PublicApiEnv>) => {
		const service = c.get('publicApiService');
		const result = await service.getPublicTrails();
		return c.json({ success: true, data: result });
	});

	// Get single trail (detail)
	router.get('/trails/:trailId', async (c: Context<PublicApiEnv>) => {
		const service = c.get('publicApiService');
		const trailId = c.req.param('trailId');
		const result = await service.getPublicTrailById(trailId);
		if (!result) {
			return c.json({ success: false, message: 'Trail not found', error: { code: 'NOT_FOUND', message: 'Trail not found' } }, 404);
		}
		return c.json({ success: true, data: result });
	});

	// Get public settings
	router.get('/settings', async (c: Context<PublicApiEnv>) => {
		const service = c.get('publicApiService');
		const result = await service.getPublicSettings();
		return c.json({ success: true, data: result });
	});

	// Get booking status
	router.get('/bookings/:bookingNumber/status', async (c: Context<PublicApiEnv>) => {
		const service = c.get('publicApiService');
		const bookingNumber = c.req.param('bookingNumber');
		const result = await service.getBookingStatus(bookingNumber);
		if (!result) {
			return c.json({ success: false, message: 'Booking not found', error: { code: 'NOT_FOUND', message: 'Booking not found' } }, 404);
		}
		return c.json({ success: true, data: result });
	});

	return router;
}