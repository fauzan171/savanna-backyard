import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { BookingsRepository } from './bookings.repository';
import { BookingsService } from './bookings.service';
import { VehiclesRepository } from '../vehicles/vehicles.repository';
import { CustomersRepository } from '../customers/customers.repository';
import { ChecklistsRepository } from '../checklists/checklists.repository';
import { VehicleConditionsRepository } from './vehicle-conditions.repository';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { validateBody, validateQuery, getValidatedBody, getValidatedQuery } from '@/worker/core/middleware/validator';
import {
	createBookingSchema,
	updateBookingSchema,
	startRentalSchema,
	completeRentalSchema,
	extendRentalSchema,
	cancelBookingSchema,
	addAddonSchema,
	scanReturnSchema,
	listBookingsQuerySchema,
	availabilityQuerySchema,
	type CreateBookingRequest,
	type UpdateBookingRequest,
	type StartRentalRequest,
	type CompleteRentalRequest,
	type ExtendRentalRequest,
	type CancelBookingRequest,
	type AddAddonRequest,
	type ScanReturnRequest,
	type ListBookingsQuery,
	type AvailabilityQuery,
} from './bookings.dto';

// Type for storing services in context
type BookingsVariables = {
	bookingsService: BookingsService;
	user: { userId: string; role: 'SUPER_ADMIN' | 'STAFF' };
};

type BookingsEnv = { Bindings: Env; Variables: BookingsVariables };

// Middleware to inject bookings services into context
export const bookingsServicesMiddleware = () => async (c: Context<BookingsEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const bookingsRepository = new BookingsRepository(db);
	const vehiclesRepository = new VehiclesRepository(db);
	const customersRepository = new CustomersRepository(db);
	const checklistsRepository = new ChecklistsRepository(db);
	const conditionsRepository = new VehicleConditionsRepository(db);
	const configRepository = new ConfigRepository(db);
	const bookingsService = new BookingsService(
		bookingsRepository,
		vehiclesRepository,
		customersRepository,
		checklistsRepository,
		configRepository,
		conditionsRepository,
	);

	c.set('bookingsService', bookingsService);
	await next();
};

// Route handlers
const listBookingsHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const query = getValidatedQuery<ListBookingsQuery>(c);
	const result = await service.list(query);
	return c.json({ success: true, data: result });
};

const getBookingByIdHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const id = c.req.param('id');
	const result = await service.getById(id);

	if (!result) {
		return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, 404);
	}

	return c.json({ success: true, data: result });
};

const getBookingByNumberHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const bookingNumber = c.req.param('bookingNumber');
	const result = await service.getByNumber(bookingNumber);

	if (!result) {
		return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, 404);
	}

	return c.json({ success: true, data: result });
};

const createBookingHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const user = c.get('user');
	const body = getValidatedBody<CreateBookingRequest>(c);
	const result = await service.create(body, user.userId);

	return c.json({
		success: true,
		data: {
			...result.booking,
			blacklistWarning: result.blacklistWarning,
			availabilityWarning: result.availabilityWarning,
		},
	}, 201);
};

const updateBookingHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const id = c.req.param('id');
	const body = getValidatedBody<UpdateBookingRequest>(c);
	const result = await service.update(id, body);
	return c.json({ success: true, data: result });
};

const confirmBookingHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const id = c.req.param('id');
	const result = await service.confirm(id);
	return c.json({ success: true, data: result });
};

const startRentalHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const id = c.req.param('id');
	const body = getValidatedBody<StartRentalRequest>(c);
	const result = await service.startRental(id, body);
	return c.json({ success: true, data: result });
};

const completeRentalHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const id = c.req.param('id');
	const body = getValidatedBody<CompleteRentalRequest>(c);
	const result = await service.completeRental(id, body);
	return c.json({ success: true, data: result });
};

const extendRentalHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const id = c.req.param('id');
	const body = getValidatedBody<ExtendRentalRequest>(c);
	const result = await service.extend(id, body);
	return c.json({ success: true, data: result });
};

const cancelBookingHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const id = c.req.param('id');
	const body = getValidatedBody<CancelBookingRequest>(c);
	const result = await service.cancel(id, body.reason);
	return c.json({
		success: true,
		data: {
			...result,
			note: 'No automatic refund processing. Handle refund manually if applicable.',
		},
	});
};

const addAddonHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const id = c.req.param('id');
	const body = getValidatedBody<AddAddonRequest>(c);
	const result = await service.addAddon(id, body);
	return c.json({ success: true, data: result }, 201);
};

const removeAddonHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const id = c.req.param('id');
	const addonId = c.req.param('addonId');
	const result = await service.removeAddon(id, addonId);
	return c.json({ success: true, data: result });
};

const checkAvailabilityHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const query = getValidatedQuery<AvailabilityQuery>(c);
	const result = await service.checkAvailability(query);
	return c.json({ success: true, data: result });
};

const getStatsHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const result = await service.getStats();
	return c.json({ success: true, data: result });
};

const scanReturnHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const body = getValidatedBody<ScanReturnRequest>(c);
	const result = await service.scanReturn(body.qrCode);
	return c.json({ success: true, data: result });
};

const getPenaltiesHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const id = c.req.param('id');
	const result = await service.getPenalties(id);
	return c.json({ success: true, data: result });
};

const markPenaltyPaidHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const id = c.req.param('id');
	const result = await service.markPenaltyPaid(id);
	return c.json({ success: true, data: result });
};

const scanQrHandler = async (c: Context<BookingsEnv>) => {
	const service = c.get('bookingsService');
	const body = getValidatedBody<{ qrCode: string; scanTime?: string }>(c);
	const scanTime = body.scanTime ?? new Date().toISOString();
	const result = await service.scanQr(body.qrCode, scanTime);
	return c.json({ success: true, data: result });
};

// Factory function to create bookings router
export function createBookingsRouter(): Hono<BookingsEnv> {
	const router = new Hono<BookingsEnv>();

	// Apply services middleware to all bookings routes
	router.use('*', bookingsServicesMiddleware());

	// All routes require authentication
	router.use('*', authMiddleware());

	// Check availability (public-ish, but requires auth)
	router.get('/availability', validateQuery(availabilityQuerySchema), checkAvailabilityHandler);

	// Get booking statistics
	router.get('/stats', getStatsHandler);

	// Scan vehicle QR to resolve the active rental (admin return processing)
	router.post('/scan-return', validateBody(scanReturnSchema), scanReturnHandler);

	// Scan vehicle QR to determine pickup checklist vs motor condition check
	router.post('/scan-qr', scanQrHandler);

	// Get booking by number
	router.get('/number/:bookingNumber', getBookingByNumberHandler);

	// List bookings (with pagination and filters)
	router.get('/', validateQuery(listBookingsQuerySchema), listBookingsHandler);

	// Get booking by ID
	router.get('/:id', getBookingByIdHandler);

	// Create booking
	router.post('/', validateBody(createBookingSchema), createBookingHandler);

	// Update booking
	router.patch('/:id', validateBody(updateBookingSchema), updateBookingHandler);

	// Confirm booking
	router.post('/:id/confirm', confirmBookingHandler);

	// Start rental (pickup)
	router.post('/:id/start', validateBody(startRentalSchema), startRentalHandler);

	// Complete rental (return)
	router.post('/:id/complete', validateBody(completeRentalSchema), completeRentalHandler);

	// Penalty management
	router.get('/:id/penalties', getPenaltiesHandler);
	router.post('/:id/penalties/mark-paid', markPenaltyPaidHandler);

	// Extend rental
	router.post('/:id/extend', validateBody(extendRentalSchema), extendRentalHandler);

	// Cancel booking
	router.post('/:id/cancel', validateBody(cancelBookingSchema), cancelBookingHandler);

	// Add addon
	router.post('/:id/addons', validateBody(addAddonSchema), addAddonHandler);

	// Remove addon
	router.delete('/:id/addons/:addonId', removeAddonHandler);

	return router;
}
