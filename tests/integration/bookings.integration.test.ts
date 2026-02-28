import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { validateBody, validateQuery } from '@/worker/core/middleware/validator';
import { getValidatedBody, getValidatedQuery } from '@/worker/core/middleware/validator';
import {
	listBookingsQuerySchema,
	createBookingSchema,
	updateBookingSchema,
	startRentalSchema,
	completeRentalSchema,
	extendRentalSchema,
	cancelBookingSchema,
	addAddonSchema,
	availabilityQuerySchema,
} from '@/worker/modules/bookings/bookings.dto';
import { BookingsService } from '@/worker/modules/bookings/bookings.service';
import { BookingsRepository } from '@/worker/modules/bookings/bookings.repository';
import { VehiclesRepository } from '@/worker/modules/vehicles/vehicles.repository';
import { CustomersRepository } from '@/worker/modules/customers/customers.repository';
import { createTestBooking, createTestCustomer, createTestVehicle } from '@test/utils';

// Simple error handler for tests
function testErrorHandler(err: Error, c: any) {
	const status = 'statusCode' in err ? (err.statusCode as number) : 500;
	const code = 'code' in err ? (err.code as string) : 'INTERNAL_ERROR';
	return c.json({ success: false, error: { message: err.message, code } }, status);
}

/**
 * Integration tests for Bookings module
 * Tests the HTTP layer with Hono app
 */
describe('Bookings Integration Tests', () => {
	let app: Hono<{ Bindings: Env; Variables: { user?: { userId: string; role: string } } }>;
	let mockBookingsService: BookingsService;
	const testJwtSecret = 'test-jwt-secret';

	// Helper to create mock services
	function createMockServices() {
		return {
			bookingRepo: {
				findById: vi.fn(),
				findByBookingNumber: vi.fn(),
				list: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				confirm: vi.fn(),
				startRental: vi.fn(),
				completeRental: vi.fn(),
				cancel: vi.fn(),
				extend: vi.fn(),
				getAddons: vi.fn(),
				createAddon: vi.fn(),
				deleteAddon: vi.fn(),
				updateAddonsAmount: vi.fn(),
				getBookingWithDetails: vi.fn(),
				findConflictingBookings: vi.fn(),
				getPaymentsByBookingId: vi.fn(),
				getStats: vi.fn(),
			} as unknown as BookingsRepository,
			vehicleRepo: {
				findById: vi.fn(),
				updateStatus: vi.fn(),
				update: vi.fn(),
				getAvailableVehicles: vi.fn(),
			} as unknown as VehiclesRepository,
			customerRepo: {
				findById: vi.fn(),
			} as unknown as CustomersRepository,
		};
	}

	beforeEach(() => {
		vi.clearAllMocks();
		app = new Hono<{ Bindings: Env; Variables: { user?: { userId: string; role: string } } }>();

		// Setup simple error handler for tests
		app.onError(testErrorHandler);

		// Setup auth middleware mock
		app.use('*', async (c, next) => {
			// Mock user context for authenticated routes
			c.set('user', { userId: 'test-user-id', role: 'STAFF' });
			await next();
		});
	});

	describe('GET /api/v1/bookings', () => {
		beforeEach(() => {
			const mocks = createMockServices();
			mockBookingsService = new BookingsService(
				mocks.bookingRepo,
				mocks.vehicleRepo,
				mocks.customerRepo
			);

			app.get('/api/v1/bookings', validateQuery(listBookingsQuerySchema), async (c) => {
				const query = getValidatedQuery(c);
				const result = await mockBookingsService.list(query);
				return c.json({ success: true, data: result });
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should list bookings with default pagination', async () => {
			const mockBookings = [
				createTestBooking({ id: 'booking-1' }),
				createTestBooking({ id: 'booking-2' }),
			];

			vi.spyOn(mockBookingsService, 'list').mockResolvedValue({
				items: mockBookings.map(b => ({ ...b, paymentStatus: { totalPaid: 0, pendingAmount: 0, remaining: b.totalAmount, isFullyPaid: false } })),
				meta: { page: 1, limit: 25, total: 2, totalPages: 1 },
			});

			const res = await app.request('/api/v1/bookings', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { items: unknown[] } };
			expect(body.success).toBe(true);
			expect(body.data.items).toHaveLength(2);
		});

		it('[P0] should filter by status', async () => {
			vi.spyOn(mockBookingsService, 'list').mockResolvedValue({
				items: [],
				meta: { page: 1, limit: 25, total: 0, totalPages: 0 },
			});

			await app.request('/api/v1/bookings?status=Confirmed', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(mockBookingsService.list).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'Confirmed' })
			);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should reject invalid status value', async () => {
			const res = await app.request('/api/v1/bookings?status=InvalidStatus', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		it('[P1] should handle pagination parameters', async () => {
			vi.spyOn(mockBookingsService, 'list').mockResolvedValue({
				items: [],
				meta: { page: 2, limit: 10, total: 50, totalPages: 5 },
			});

			const res = await app.request('/api/v1/bookings?page=2&limit=10', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			expect(mockBookingsService.list).toHaveBeenCalledWith(
				expect.objectContaining({ page: 2, limit: 10 })
			);
		});

		it('[P1] should reject page limit exceeding 100', async () => {
			const res = await app.request('/api/v1/bookings?limit=200', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});
	});

	describe('GET /api/v1/bookings/:id', () => {
		beforeEach(() => {
			const mocks = createMockServices();
			mockBookingsService = new BookingsService(
				mocks.bookingRepo,
				mocks.vehicleRepo,
				mocks.customerRepo
			);

			app.get('/api/v1/bookings/:id', async (c) => {
				const id = c.req.param('id');
				const result = await mockBookingsService.getById(id);
				if (!result) {
					return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, 404);
				}
				return c.json({ success: true, data: result });
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should return booking by ID', async () => {
			const mockBooking = createTestBooking();

			vi.spyOn(mockBookingsService, 'getById').mockResolvedValue({
				...mockBooking,
				customer: { id: 'cust-1', name: 'John', phone: '+62812', email: null, isBlacklisted: false },
				vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', dailyRateIdr: 450000 },
				addons: [],
				payments: [],
				paymentSummary: { totalPaid: 0, pendingAmount: 0, remaining: mockBooking.totalAmount, isFullyPaid: false },
				createdBy: null,
			});

			const res = await app.request(`/api/v1/bookings/${mockBooking.id}`, {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { id: string } };
			expect(body.success).toBe(true);
			expect(body.data.id).toBe(mockBooking.id);
		});

		it('[P0] should return 404 for non-existent booking', async () => {
			vi.spyOn(mockBookingsService, 'getById').mockResolvedValue(null);

			const res = await app.request('/api/v1/bookings/nonexistent-id', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(404);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should include addons in response', async () => {
			const mockBooking = createTestBooking();

			vi.spyOn(mockBookingsService, 'getById').mockResolvedValue({
				...mockBooking,
				customer: { id: 'cust-1', name: 'John', phone: '+62812', email: null, isBlacklisted: false },
				vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', dailyRateIdr: 450000 },
				addons: [{ id: 'addon-1', type: 'SafetyGear', description: 'Helmet', amount: 100000, isMandatory: true }],
				payments: [],
				paymentSummary: { totalPaid: 0, pendingAmount: 0, remaining: mockBooking.totalAmount, isFullyPaid: false },
				createdBy: null,
			});

			const res = await app.request(`/api/v1/bookings/${mockBooking.id}`, {}, { JWT_SECRET: testJwtSecret } as Env);
			const body = await res.json() as { success: boolean; data: { addons: { id: string }[] } };

			expect(body.data.addons).toHaveLength(1);
			expect(body.data.addons[0].id).toBe('addon-1');
		});
	});

	describe('POST /api/v1/bookings', () => {
		beforeEach(() => {
			const mocks = createMockServices();
			mockBookingsService = new BookingsService(
				mocks.bookingRepo,
				mocks.vehicleRepo,
				mocks.customerRepo
			);

			app.post('/api/v1/bookings', validateBody(createBookingSchema), async (c) => {
				const body = getValidatedBody(c);
				const user = c.get('user');
				const result = await mockBookingsService.create(body, user?.userId ?? 'system');
				return c.json({ success: true, data: result }, 201);
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should create booking with valid data', async () => {
			const mockBooking = createTestBooking();
			const mockCustomer = createTestCustomer();
			const mockVehicle = createTestVehicle();

			vi.spyOn(mockBookingsService, 'create').mockResolvedValue({
				booking: {
					...mockBooking,
					customer: { id: mockCustomer.id, name: mockCustomer.name, phone: mockCustomer.phone, email: mockCustomer.email, isBlacklisted: false },
					vehicle: { id: mockVehicle.id, name: mockVehicle.name, plateNumber: mockVehicle.plateNumber, type: mockVehicle.type, dailyRateIdr: mockVehicle.dailyRateIdr },
				},
				blacklistWarning: null,
				availabilityWarning: null,
			});

			const res = await app.request('/api/v1/bookings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					customerId: '123e4567-e89b-12d3-a456-426614174000',
					vehicleId: '123e4567-e89b-12d3-a456-426614174001',
					startDate: '2026-03-05',
					endDate: '2026-03-08',
					paymentTerms: 'DP_Pickup',
					currency: 'IDR',
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(201);
			const body = await res.json() as { success: boolean; data: { booking: { id: string } } };
			expect(body.success).toBe(true);
			expect(body.data.booking).toBeDefined();
		});

		it('[P0] should reject missing required fields', async () => {
			const res = await app.request('/api/v1/bookings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					customerId: 'customer-1',
					// Missing vehicleId, dates, paymentTerms
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		it('[P0] should reject invalid date format', async () => {
			const res = await app.request('/api/v1/bookings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					customerId: '123e4567-e89b-12d3-a456-426614174000',
					vehicleId: '123e4567-e89b-12d3-a456-426614174001',
					startDate: '03/05/2026', // Wrong format
					endDate: '2026-03-08',
					paymentTerms: 'DP_Pickup',
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		it('[P0] should reject endDate before startDate', async () => {
			const res = await app.request('/api/v1/bookings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					customerId: '123e4567-e89b-12d3-a456-426614174000',
					vehicleId: '123e4567-e89b-12d3-a456-426614174001',
					startDate: '2026-03-10',
					endDate: '2026-03-05', // Before start
					paymentTerms: 'DP_Pickup',
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should accept valid addons', async () => {
			const mockBooking = createTestBooking();

			vi.spyOn(mockBookingsService, 'create').mockResolvedValue({
				booking: mockBooking as any,
				blacklistWarning: null,
				availabilityWarning: null,
			});

			const res = await app.request('/api/v1/bookings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					customerId: '123e4567-e89b-12d3-a456-426614174000',
					vehicleId: '123e4567-e89b-12d3-a456-426614174001',
					startDate: '2026-03-05',
					endDate: '2026-03-08',
					paymentTerms: 'DP_Pickup',
					addons: [
						{ type: 'SafetyGear', description: 'Helmet', amount: 100000, isMandatory: true },
					],
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(201);
		});

		it('[P1] should reject invalid addon type', async () => {
			const res = await app.request('/api/v1/bookings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					customerId: '123e4567-e89b-12d3-a456-426614174000',
					vehicleId: '123e4567-e89b-12d3-a456-426614174001',
					startDate: '2026-03-05',
					endDate: '2026-03-08',
					paymentTerms: 'DP_Pickup',
					addons: [
						{ type: 'InvalidType', amount: 100000, isMandatory: true },
					],
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		it('[P1] should reject negative addon amount', async () => {
			const res = await app.request('/api/v1/bookings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					customerId: '123e4567-e89b-12d3-a456-426614174000',
					vehicleId: '123e4567-e89b-12d3-a456-426614174001',
					startDate: '2026-03-05',
					endDate: '2026-03-08',
					paymentTerms: 'DP_Pickup',
					addons: [
						{ type: 'SafetyGear', amount: -100, isMandatory: true },
					],
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		it('[P1] should reject invalid payment terms', async () => {
			const res = await app.request('/api/v1/bookings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					customerId: '123e4567-e89b-12d3-a456-426614174000',
					vehicleId: '123e4567-e89b-12d3-a456-426614174001',
					startDate: '2026-03-05',
					endDate: '2026-03-08',
					paymentTerms: 'Invalid_Term',
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});
	});

	describe('POST /api/v1/bookings/:id/confirm', () => {
		beforeEach(() => {
			const mocks = createMockServices();
			mockBookingsService = new BookingsService(
				mocks.bookingRepo,
				mocks.vehicleRepo,
				mocks.customerRepo
			);

			app.post('/api/v1/bookings/:id/confirm', async (c) => {
				const id = c.req.param('id');
				const result = await mockBookingsService.confirm(id);
				return c.json({ success: true, data: result });
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should confirm a pending booking', async () => {
			const mockBooking = createTestBooking({ status: 'Pending' });

			vi.spyOn(mockBookingsService, 'confirm').mockResolvedValue({
				...mockBooking,
				status: 'Confirmed',
			} as any);

			const res = await app.request(`/api/v1/bookings/${mockBooking.id}/confirm`, {
				method: 'POST',
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { status: string } };
			expect(body.data.status).toBe('Confirmed');
		});
	});

	describe('POST /api/v1/bookings/:id/start', () => {
		beforeEach(() => {
			const mocks = createMockServices();
			mockBookingsService = new BookingsService(
				mocks.bookingRepo,
				mocks.vehicleRepo,
				mocks.customerRepo
			);

			app.post('/api/v1/bookings/:id/start', validateBody(startRentalSchema), async (c) => {
				const id = c.req.param('id');
				const body = getValidatedBody(c);
				const result = await mockBookingsService.startRental(id, body);
				return c.json({ success: true, data: result });
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should start rental with valid data', async () => {
			const mockBooking = createTestBooking({ status: 'Confirmed' });

			vi.spyOn(mockBookingsService, 'startRental').mockResolvedValue({
				...mockBooking,
				status: 'Active',
				startKm: 15000,
			} as any);

			const res = await app.request(`/api/v1/bookings/${mockBooking.id}/start`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ startKm: 15000 }),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { status: string } };
			expect(body.data.status).toBe('Active');
		});

		it('[P0] should reject negative startKm', async () => {
			const res = await app.request('/api/v1/bookings/booking-id/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ startKm: -100 }),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should accept zero startKm', async () => {
			const mockBooking = createTestBooking({ status: 'Confirmed' });

			vi.spyOn(mockBookingsService, 'startRental').mockResolvedValue({
				...mockBooking,
				status: 'Active',
				startKm: 0,
			} as any);

			const res = await app.request(`/api/v1/bookings/${mockBooking.id}/start`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ startKm: 0 }),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
		});

		it('[P1] should accept optional pickupNotes', async () => {
			const mockBooking = createTestBooking({ status: 'Confirmed' });

			vi.spyOn(mockBookingsService, 'startRental').mockResolvedValue({
				...mockBooking,
				status: 'Active',
			} as any);

			const res = await app.request(`/api/v1/bookings/${mockBooking.id}/start`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ startKm: 15000, pickupNotes: 'Vehicle inspected' }),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
		});
	});

	describe('POST /api/v1/bookings/:id/complete', () => {
		beforeEach(() => {
			const mocks = createMockServices();
			mockBookingsService = new BookingsService(
				mocks.bookingRepo,
				mocks.vehicleRepo,
				mocks.customerRepo
			);

			app.post('/api/v1/bookings/:id/complete', validateBody(completeRentalSchema), async (c) => {
				const id = c.req.param('id');
				const body = getValidatedBody(c);
				const result = await mockBookingsService.completeRental(id, body);
				return c.json({ success: true, data: result });
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should complete rental on time', async () => {
			const mockBooking = createTestBooking({ status: 'Active', startKm: 15000 });

			vi.spyOn(mockBookingsService, 'completeRental').mockResolvedValue({
				...mockBooking,
				status: 'Completed',
				actualReturnDate: '2026-03-08',
				endKm: 16000,
				lateFee: 0,
				lateFeeDetails: null,
				vehicleStatus: 'Available',
			} as any);

			const res = await app.request(`/api/v1/bookings/${mockBooking.id}/complete`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					actualReturnDate: '2026-03-08',
					endKm: 16000,
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { status: string; lateFee: number } };
			expect(body.data.status).toBe('Completed');
			expect(body.data.lateFee).toBe(0);
		});

		it('[P0] should complete rental with late fee', async () => {
			const mockBooking = createTestBooking({ status: 'Active', startKm: 15000, endDate: '2026-03-08' });

			vi.spyOn(mockBookingsService, 'completeRental').mockResolvedValue({
				...mockBooking,
				status: 'Completed',
				actualReturnDate: '2026-03-10',
				endKm: 16000,
				lateFee: 675000,
				lateFeeDetails: {
					daysLate: 2,
					dailyRate: 450000,
					multiplier: 1.5,
					calculation: '2 day(s) x 450000 x 1.5 = 1350000',
				},
				vehicleStatus: 'Available',
			} as any);

			const res = await app.request(`/api/v1/bookings/${mockBooking.id}/complete`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					actualReturnDate: '2026-03-10',
					endKm: 16000,
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { lateFee: number; lateFeeDetails: { daysLate: number } } };
			expect(body.data.lateFee).toBe(675000);
			expect(body.data.lateFeeDetails.daysLate).toBe(2);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should accept optional damageNotes', async () => {
			const mockBooking = createTestBooking({ status: 'Active', startKm: 15000 });

			vi.spyOn(mockBookingsService, 'completeRental').mockResolvedValue({
				...mockBooking,
				status: 'Completed',
				lateFeeDetails: null,
				vehicleStatus: 'Available',
			} as any);

			const res = await app.request(`/api/v1/bookings/${mockBooking.id}/complete`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					actualReturnDate: '2026-03-08',
					endKm: 16000,
					damageNotes: 'Minor scratch on left side',
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
		});
	});

	describe('POST /api/v1/bookings/:id/extend', () => {
		beforeEach(() => {
			const mocks = createMockServices();
			mockBookingsService = new BookingsService(
				mocks.bookingRepo,
				mocks.vehicleRepo,
				mocks.customerRepo
			);

			app.post('/api/v1/bookings/:id/extend', validateBody(extendRentalSchema), async (c) => {
				const id = c.req.param('id');
				const body = getValidatedBody(c);
				const result = await mockBookingsService.extend(id, body);
				return c.json({ success: true, data: result });
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should extend rental successfully', async () => {
			vi.spyOn(mockBookingsService, 'extend').mockResolvedValue({
				id: 'booking-1',
				originalEndDate: '2026-03-08',
				newEndDate: '2026-03-10',
				additionalDays: 2,
				additionalAmount: 900000,
				newTotalAmount: 2250000,
				extendedAt: new Date().toISOString(),
			});

			const res = await app.request('/api/v1/bookings/booking-1/extend', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ newEndDate: '2026-03-10' }),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { additionalDays: number } };
			expect(body.data.additionalDays).toBe(2);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should reject invalid date format', async () => {
			const res = await app.request('/api/v1/bookings/booking-1/extend', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ newEndDate: '03/10/2026' }),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});
	});

	describe('POST /api/v1/bookings/:id/cancel', () => {
		beforeEach(() => {
			const mocks = createMockServices();
			mockBookingsService = new BookingsService(
				mocks.bookingRepo,
				mocks.vehicleRepo,
				mocks.customerRepo
			);

			app.post('/api/v1/bookings/:id/cancel', validateBody(cancelBookingSchema), async (c) => {
				const id = c.req.param('id');
				const body = getValidatedBody(c);
				const result = await mockBookingsService.cancel(id, body.reason);
				return c.json({ success: true, data: result });
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should cancel booking with reason', async () => {
			const mockBooking = createTestBooking({ status: 'Pending' });

			vi.spyOn(mockBookingsService, 'cancel').mockResolvedValue({
				...mockBooking,
				status: 'Cancelled',
			} as any);

			const res = await app.request(`/api/v1/bookings/${mockBooking.id}/cancel`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason: 'Customer requested cancellation' }),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { status: string } };
			expect(body.data.status).toBe('Cancelled');
		});

		it('[P0] should reject missing reason', async () => {
			const res = await app.request('/api/v1/bookings/booking-1/cancel', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should reject empty reason', async () => {
			const res = await app.request('/api/v1/bookings/booking-1/cancel', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason: '' }),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		it('[P1] should reject reason exceeding 500 chars', async () => {
			const res = await app.request('/api/v1/bookings/booking-1/cancel', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason: 'A'.repeat(501) }),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});
	});

	describe('POST /api/v1/bookings/:id/addons', () => {
		beforeEach(() => {
			const mocks = createMockServices();
			mockBookingsService = new BookingsService(
				mocks.bookingRepo,
				mocks.vehicleRepo,
				mocks.customerRepo
			);

			app.post('/api/v1/bookings/:id/addons', validateBody(addAddonSchema), async (c) => {
				const id = c.req.param('id');
				const body = getValidatedBody(c);
				const result = await mockBookingsService.addAddon(id, body);
				return c.json({ success: true, data: result }, 201);
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should add addon to booking', async () => {
			vi.spyOn(mockBookingsService, 'addAddon').mockResolvedValue({
				addon: { id: 'addon-1', type: 'SafetyGear', description: 'Helmet', amount: 100000, isMandatory: true },
				newTotalAmount: 1450000,
			});

			const res = await app.request('/api/v1/bookings/booking-1/addons', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'SafetyGear',
					description: 'Helmet',
					amount: 100000,
					isMandatory: true,
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(201);
		});
	});

	describe('GET /api/v1/bookings/availability', () => {
		beforeEach(() => {
			const mocks = createMockServices();
			mockBookingsService = new BookingsService(
				mocks.bookingRepo,
				mocks.vehicleRepo,
				mocks.customerRepo
			);

			app.get('/api/v1/bookings/availability', validateQuery(availabilityQuerySchema), async (c) => {
				const query = getValidatedQuery(c);
				const result = await mockBookingsService.checkAvailability(query);
				return c.json({ success: true, data: result });
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should check availability for date range', async () => {
			const mockVehicle = createTestVehicle();

			vi.spyOn(mockBookingsService, 'checkAvailability').mockResolvedValue({
				requestedPeriod: { startDate: '2026-03-05', endDate: '2026-03-08' },
				availableVehicles: [{ id: mockVehicle.id, name: mockVehicle.name, type: mockVehicle.type, dailyRateIdr: mockVehicle.dailyRateIdr, plateNumber: mockVehicle.plateNumber }],
				unavailableVehicles: [],
				maintenanceVehicles: [],
			});

			const res = await app.request('/api/v1/bookings/availability?startDate=2026-03-05&endDate=2026-03-08', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { availableVehicles: unknown[] } };
			expect(body.data.availableVehicles).toHaveLength(1);
		});

		it('[P0] should reject missing date parameters', async () => {
			const res = await app.request('/api/v1/bookings/availability', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should filter by vehicle type', async () => {
			vi.spyOn(mockBookingsService, 'checkAvailability').mockResolvedValue({
				requestedPeriod: { startDate: '2026-03-05', endDate: '2026-03-08' },
				availableVehicles: [],
				unavailableVehicles: [],
				maintenanceVehicles: [],
			});

			await app.request('/api/v1/bookings/availability?startDate=2026-03-05&endDate=2026-03-08&type=TrailBike', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(mockBookingsService.checkAvailability).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'TrailBike' })
			);
		});

		it('[P1] should reject endDate before startDate', async () => {
			const res = await app.request('/api/v1/bookings/availability?startDate=2026-03-10&endDate=2026-03-05', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});
	});
});
