import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { validateBody, validateQuery } from '@/worker/core/middleware/validator';
import { getValidatedBody, getValidatedQuery } from '@/worker/core/middleware/validator';
import {
	listPaymentsQuerySchema,
	createPaymentSchema,
	verifyPaymentSchema,
	rejectPaymentSchema,
} from '@/worker/modules/payments/payments.dto';
import { PaymentsService } from '@/worker/modules/payments/payments.service';
import { PaymentsRepository } from '@/worker/modules/payments/payments.repository';
import { BookingsRepository } from '@/worker/modules/bookings/bookings.repository';
import { createTestPayment, createTestBooking } from '@test/utils';

// Simple error handler for tests
function testErrorHandler(err: Error, c: any) {
	const status = 'statusCode' in err ? (err.statusCode as number) : 500;
	const code = 'code' in err ? (err.code as string) : 'INTERNAL_ERROR';
	return c.json({ success: false, error: { message: err.message, code } }, status);
}

/**
 * Integration tests for Payments module
 * Tests the HTTP layer with Hono app
 */
describe('Payments Integration Tests', () => {
	let app: Hono<{ Bindings: Env; Variables: { user?: { userId: string; role: string } } }>;
	let mockPaymentsService: PaymentsService;
	const testJwtSecret = 'test-jwt-secret';

	// Helper to create mock services
	function createMockServices() {
		return {
			paymentRepo: {
				findById: vi.fn(),
				list: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				verify: vi.fn(),
				reject: vi.fn(),
				getByBookingId: vi.fn(),
				findByTransactionReference: vi.fn(),
				getPaymentWithDetails: vi.fn(),
				getPendingPayments: vi.fn(),
				getPaymentSummary: vi.fn(),
				getStats: vi.fn(),
			} as unknown as PaymentsRepository,
			bookingRepo: {
				findById: vi.fn(),
				confirm: vi.fn(),
			} as unknown as BookingsRepository,
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

	describe('GET /api/v1/payments', () => {
		beforeEach(() => {
			const mocks = createMockServices();
			mockPaymentsService = new PaymentsService(mocks.paymentRepo, mocks.bookingRepo);

			app.get('/api/v1/payments', validateQuery(listPaymentsQuerySchema), async (c) => {
				const query = getValidatedQuery(c);
				const result = await mockPaymentsService.list(query);
				return c.json({ success: true, data: result });
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should list payments with default pagination', async () => {
			const mockPayments = [
				createTestPayment({ id: 'pay-1' }),
				createTestPayment({ id: 'pay-2' }),
			];

			vi.spyOn(mockPaymentsService, 'list').mockResolvedValue({
				items: mockPayments.map(p => ({
					id: p.id,
					booking: { id: 'booking-1', bookingNumber: 'SM-001', customerName: 'John' },
					amount: p.amount,
					currency: p.currency,
					method: p.method,
					status: p.status,
					transactionReference: p.transactionReference,
					verifiedBy: null,
					verifiedAt: null,
					notes: null,
					createdAt: p.createdAt,
					updatedAt: p.updatedAt,
				})),
				meta: { page: 1, limit: 25, total: 2, totalPages: 1 },
			});

			const res = await app.request('/api/v1/payments', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { items: unknown[] } };
			expect(body.success).toBe(true);
			expect(body.data.items).toHaveLength(2);
		});

		it('[P0] should filter by bookingId', async () => {
			vi.spyOn(mockPaymentsService, 'list').mockResolvedValue({
				items: [],
				meta: { page: 1, limit: 25, total: 0, totalPages: 0 },
			});

			await app.request('/api/v1/payments?bookingId=123e4567-e89b-12d3-a456-426614174000', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(mockPaymentsService.list).toHaveBeenCalledWith(
				expect.objectContaining({ bookingId: '123e4567-e89b-12d3-a456-426614174000' })
			);
		});

		it('[P0] should filter by status', async () => {
			vi.spyOn(mockPaymentsService, 'list').mockResolvedValue({
				items: [],
				meta: { page: 1, limit: 25, total: 0, totalPages: 0 },
			});

			await app.request('/api/v1/payments?status=Verified', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(mockPaymentsService.list).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'Verified' })
			);
		});

		it('[P0] should filter by method', async () => {
			vi.spyOn(mockPaymentsService, 'list').mockResolvedValue({
				items: [],
				meta: { page: 1, limit: 25, total: 0, totalPages: 0 },
			});

			await app.request('/api/v1/payments?method=QRIS', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(mockPaymentsService.list).toHaveBeenCalledWith(
				expect.objectContaining({ method: 'QRIS' })
			);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should reject invalid status value', async () => {
			const res = await app.request('/api/v1/payments?status=Invalid', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		it('[P1] should reject invalid method value', async () => {
			const res = await app.request('/api/v1/payments?method=Invalid', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		it('[P1] should filter by date range', async () => {
			vi.spyOn(mockPaymentsService, 'list').mockResolvedValue({
				items: [],
				meta: { page: 1, limit: 25, total: 0, totalPages: 0 },
			});

			await app.request('/api/v1/payments?dateFrom=2026-03-01&dateTo=2026-03-31', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(mockPaymentsService.list).toHaveBeenCalledWith(
				expect.objectContaining({
					dateFrom: '2026-03-01',
					dateTo: '2026-03-31',
				})
			);
		});

		it('[P1] should reject invalid date format', async () => {
			const res = await app.request('/api/v1/payments?dateFrom=03/01/2026', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		it('[P1] should handle pagination parameters', async () => {
			vi.spyOn(mockPaymentsService, 'list').mockResolvedValue({
				items: [],
				meta: { page: 2, limit: 10, total: 50, totalPages: 5 },
			});

			const res = await app.request('/api/v1/payments?page=2&limit=10', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			expect(mockPaymentsService.list).toHaveBeenCalledWith(
				expect.objectContaining({ page: 2, limit: 10 })
			);
		});

		it('[P1] should reject page limit exceeding 100', async () => {
			const res = await app.request('/api/v1/payments?limit=200', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});
	});

	describe('GET /api/v1/payments/:id', () => {
		beforeEach(() => {
			const mocks = createMockServices();
			mockPaymentsService = new PaymentsService(mocks.paymentRepo, mocks.bookingRepo);

			app.get('/api/v1/payments/:id', async (c) => {
				const id = c.req.param('id');
				const result = await mockPaymentsService.getById(id);
				if (!result) {
					return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' } }, 404);
				}
				return c.json({ success: true, data: result });
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should return payment by ID', async () => {
			const mockPayment = createTestPayment();

			vi.spyOn(mockPaymentsService, 'getById').mockResolvedValue({
				id: mockPayment.id,
				booking: {
					id: 'booking-1',
					bookingNumber: 'SM-001',
					customerName: 'John Doe',
					customer: { id: 'cust-1', name: 'John Doe', phone: '+62812' },
					vehicle: { id: 'veh-1', name: 'Honda CRF' },
					totalAmount: 1500000,
					status: 'Confirmed',
				},
				amount: mockPayment.amount,
				currency: mockPayment.currency,
				method: mockPayment.method,
				status: mockPayment.status,
				transactionReference: mockPayment.transactionReference,
				verifiedBy: null,
				verifiedAt: null,
				notes: null,
				gatewayResponse: { paymentUrl: null, paidAt: null },
				createdAt: mockPayment.createdAt,
				updatedAt: mockPayment.updatedAt,
			});

			const res = await app.request(`/api/v1/payments/${mockPayment.id}`, {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { id: string } };
			expect(body.success).toBe(true);
			expect(body.data.id).toBe(mockPayment.id);
		});

		it('[P0] should return 404 for non-existent payment', async () => {
			vi.spyOn(mockPaymentsService, 'getById').mockResolvedValue(null);

			const res = await app.request('/api/v1/payments/nonexistent-id', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(404);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should include verifier info for verified payment', async () => {
			const mockPayment = createTestPayment({
				status: 'Verified',
				verifiedBy: 'staff-1',
				verifiedAt: '2026-03-01T10:00:00Z',
			});

			vi.spyOn(mockPaymentsService, 'getById').mockResolvedValue({
				id: mockPayment.id,
				booking: {
					id: 'booking-1',
					bookingNumber: 'SM-001',
					customerName: 'John Doe',
					customer: { id: 'cust-1', name: 'John Doe', phone: '+62812' },
					vehicle: { id: 'veh-1', name: 'Honda CRF' },
					totalAmount: 1500000,
					status: 'Confirmed',
				},
				amount: mockPayment.amount,
				currency: mockPayment.currency,
				method: mockPayment.method,
				status: 'Verified',
				transactionReference: mockPayment.transactionReference,
				verifiedBy: { id: 'staff-1', name: 'Staff John' },
				verifiedAt: '2026-03-01T10:00:00Z',
				notes: null,
				gatewayResponse: { paymentUrl: null, paidAt: '2026-03-01T10:00:00Z' },
				createdAt: mockPayment.createdAt,
				updatedAt: mockPayment.updatedAt,
			});

			const res = await app.request(`/api/v1/payments/${mockPayment.id}`, {}, { JWT_SECRET: testJwtSecret } as Env);
			const body = await res.json() as { success: boolean; data: { verifiedBy: { name: string } } };

			expect(body.data.verifiedBy.name).toBe('Staff John');
		});
	});

	describe('POST /api/v1/payments', () => {
		beforeEach(() => {
			const mocks = createMockServices();
			mockPaymentsService = new PaymentsService(mocks.paymentRepo, mocks.bookingRepo);

			app.post('/api/v1/payments', validateBody(createPaymentSchema), async (c) => {
				const body = getValidatedBody(c);
				const result = await mockPaymentsService.create(body);
				return c.json({ success: true, data: result }, 201);
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should create payment with valid data', async () => {
			const mockPayment = createTestPayment();

			vi.spyOn(mockPaymentsService, 'create').mockResolvedValue({
				id: mockPayment.id,
				booking: { id: 'booking-1', bookingNumber: 'SM-001', customerName: 'John' },
				amount: 500000,
				currency: 'IDR',
				method: 'QRIS',
				status: 'Pending',
				transactionReference: 'TXN-123',
				verifiedBy: null,
				verifiedAt: null,
				notes: null,
				createdAt: mockPayment.createdAt,
				updatedAt: mockPayment.updatedAt,
			});

			const res = await app.request('/api/v1/payments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bookingId: '123e4567-e89b-12d3-a456-426614174000',
					amount: 500000,
					currency: 'IDR',
					method: 'QRIS',
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(201);
			const body = await res.json() as { success: boolean; data: { status: string } };
			expect(body.success).toBe(true);
			expect(body.data.status).toBe('Pending');
		});

		it('[P0] should reject missing required fields', async () => {
			const res = await app.request('/api/v1/payments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bookingId: '123e4567-e89b-12d3-a456-426614174000',
					// Missing amount, method
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		it('[P0] should reject invalid UUID for bookingId', async () => {
			const res = await app.request('/api/v1/payments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bookingId: 'not-a-uuid',
					amount: 500000,
					method: 'QRIS',
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		it('[P0] should reject zero or negative amount', async () => {
			const res = await app.request('/api/v1/payments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bookingId: '123e4567-e89b-12d3-a456-426614174000',
					amount: 0,
					method: 'QRIS',
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);

			const res2 = await app.request('/api/v1/payments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bookingId: '123e4567-e89b-12d3-a456-426614174000',
					amount: -100,
					method: 'QRIS',
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res2.status).toBe(400);
		});

		it('[P0] should reject invalid payment method', async () => {
			const res = await app.request('/api/v1/payments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bookingId: '123e4567-e89b-12d3-a456-426614174000',
					amount: 500000,
					method: 'InvalidMethod',
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should accept all valid payment methods', async () => {
			const methods = ['QRIS', 'Gateway', 'BankTransfer', 'Cash'];

			for (const method of methods) {
				vi.spyOn(mockPaymentsService, 'create').mockResolvedValue({
					id: 'pay-1',
					booking: { id: 'booking-1', bookingNumber: 'SM-001', customerName: 'John' },
					amount: 500000,
					currency: 'IDR',
					method: method as any,
					status: 'Pending',
					transactionReference: null,
					verifiedBy: null,
					verifiedAt: null,
					notes: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				});

				const res = await app.request('/api/v1/payments', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						bookingId: '123e4567-e89b-12d3-a456-426614174000',
						amount: 500000,
						method,
					}),
				}, { JWT_SECRET: testJwtSecret } as Env);

				expect(res.status).toBe(201);
			}
		});

		it('[P1] should accept optional transactionReference', async () => {
			vi.spyOn(mockPaymentsService, 'create').mockResolvedValue({
				id: 'pay-1',
				booking: { id: 'booking-1', bookingNumber: 'SM-001', customerName: 'John' },
				amount: 500000,
				currency: 'IDR',
				method: 'QRIS',
				status: 'Pending',
				transactionReference: 'TXN-SPECIAL-123',
				verifiedBy: null,
				verifiedAt: null,
				notes: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});

			const res = await app.request('/api/v1/payments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bookingId: '123e4567-e89b-12d3-a456-426614174000',
					amount: 500000,
					method: 'QRIS',
					transactionReference: 'TXN-SPECIAL-123',
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(201);
		});

		it('[P1] should accept optional notes', async () => {
			vi.spyOn(mockPaymentsService, 'create').mockResolvedValue({
				id: 'pay-1',
				booking: { id: 'booking-1', bookingNumber: 'SM-001', customerName: 'John' },
				amount: 500000,
				currency: 'IDR',
				method: 'BankTransfer',
				status: 'Pending',
				transactionReference: null,
				verifiedBy: null,
				verifiedAt: null,
				notes: 'DP payment via BCA',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});

			const res = await app.request('/api/v1/payments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bookingId: '123e4567-e89b-12d3-a456-426614174000',
					amount: 500000,
					method: 'BankTransfer',
					notes: 'DP payment via BCA',
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(201);
		});

		it('[P1] should default currency to IDR', async () => {
			vi.spyOn(mockPaymentsService, 'create').mockResolvedValue({
				id: 'pay-1',
				booking: { id: 'booking-1', bookingNumber: 'SM-001', customerName: 'John' },
				amount: 500000,
				currency: 'IDR',
				method: 'QRIS',
				status: 'Pending',
				transactionReference: null,
				verifiedBy: null,
				verifiedAt: null,
				notes: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});

			await app.request('/api/v1/payments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bookingId: '123e4567-e89b-12d3-a456-426614174000',
					amount: 500000,
					method: 'QRIS',
					// No currency specified
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(mockPaymentsService.create).toHaveBeenCalledWith(
				expect.objectContaining({ currency: 'IDR' })
			);
		});

		it('[P1] should reject notes exceeding 1000 chars', async () => {
			const res = await app.request('/api/v1/payments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bookingId: '123e4567-e89b-12d3-a456-426614174000',
					amount: 500000,
					method: 'QRIS',
					notes: 'A'.repeat(1001),
				}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});
	});

	describe('POST /api/v1/payments/:id/verify', () => {
		beforeEach(() => {
			const mocks = createMockServices();
			mockPaymentsService = new PaymentsService(mocks.paymentRepo, mocks.bookingRepo);

			app.post('/api/v1/payments/:id/verify', validateBody(verifyPaymentSchema), async (c) => {
				const id = c.req.param('id');
				const body = getValidatedBody(c);
				const user = c.get('user');
				const result = await mockPaymentsService.verify(id, user?.userId ?? 'system', body);
				return c.json({ success: true, data: result });
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should verify pending payment', async () => {
			vi.spyOn(mockPaymentsService, 'verify').mockResolvedValue({
				id: 'pay-1',
				status: 'Verified',
				verifiedBy: { id: 'test-user-id', name: 'Staff John' },
				verifiedAt: '2026-03-01T10:00:00Z',
				bookingStatus: 'Confirmed',
				paymentSummary: {
					totalPaid: 500000,
					remaining: 1000000,
					isFullyPaid: false,
				},
			});

			const res = await app.request('/api/v1/payments/pay-1/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { status: string } };
			expect(body.data.status).toBe('Verified');
		});

		it('[P0] should accept verification notes', async () => {
			vi.spyOn(mockPaymentsService, 'verify').mockResolvedValue({
				id: 'pay-1',
				status: 'Verified',
				verifiedBy: { id: 'test-user-id', name: 'Staff John' },
				verifiedAt: '2026-03-01T10:00:00Z',
				bookingStatus: 'Confirmed',
				paymentSummary: {
					totalPaid: 500000,
					remaining: 1000000,
					isFullyPaid: false,
				},
			});

			await app.request('/api/v1/payments/pay-1/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notes: 'Verified via bank statement' }),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(mockPaymentsService.verify).toHaveBeenCalledWith(
				'pay-1',
				'test-user-id',
				expect.objectContaining({ notes: 'Verified via bank statement' })
			);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should reject notes exceeding 500 chars', async () => {
			const res = await app.request('/api/v1/payments/pay-1/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notes: 'A'.repeat(501) }),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		it('[P1] should return booking status after verification', async () => {
			vi.spyOn(mockPaymentsService, 'verify').mockResolvedValue({
				id: 'pay-1',
				status: 'Verified',
				verifiedBy: { id: 'test-user-id', name: 'Staff John' },
				verifiedAt: '2026-03-01T10:00:00Z',
				bookingStatus: 'Confirmed',
				paymentSummary: {
					totalPaid: 500000,
					remaining: 1000000,
					isFullyPaid: false,
				},
			});

			const res = await app.request('/api/v1/payments/pay-1/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			const body = await res.json() as { success: boolean; data: { bookingStatus: string } };
			expect(body.data.bookingStatus).toBe('Confirmed');
		});

		it('[P1] should return payment summary after verification', async () => {
			vi.spyOn(mockPaymentsService, 'verify').mockResolvedValue({
				id: 'pay-1',
				status: 'Verified',
				verifiedBy: { id: 'test-user-id', name: 'Staff John' },
				verifiedAt: '2026-03-01T10:00:00Z',
				bookingStatus: 'Confirmed',
				paymentSummary: {
					totalPaid: 1500000,
					remaining: 0,
					isFullyPaid: true,
				},
			});

			const res = await app.request('/api/v1/payments/pay-1/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			}, { JWT_SECRET: testJwtSecret } as Env);

			const body = await res.json() as { success: boolean; data: { paymentSummary: { isFullyPaid: boolean } } };
			expect(body.data.paymentSummary.isFullyPaid).toBe(true);
		});
	});

	describe('POST /api/v1/payments/:id/reject', () => {
		beforeEach(() => {
			const mocks = createMockServices();
			mockPaymentsService = new PaymentsService(mocks.paymentRepo, mocks.bookingRepo);

			app.post('/api/v1/payments/:id/reject', validateBody(rejectPaymentSchema), async (c) => {
				const id = c.req.param('id');
				const body = getValidatedBody(c);
				const result = await mockPaymentsService.reject(id, body);
				return c.json({ success: true, data: result });
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should reject pending payment', async () => {
			vi.spyOn(mockPaymentsService, 'reject').mockResolvedValue({
				id: 'pay-1',
				booking: { id: 'booking-1', bookingNumber: 'SM-001', customerName: 'John' },
				amount: 500000,
				currency: 'IDR',
				method: 'QRIS',
				status: 'Failed',
				transactionReference: 'TXN-123',
				verifiedBy: null,
				verifiedAt: null,
				notes: 'Invalid transaction reference',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});

			const res = await app.request('/api/v1/payments/pay-1/reject', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason: 'Invalid transaction reference' }),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { status: string } };
			expect(body.data.status).toBe('Failed');
		});

		it('[P0] should require rejection reason', async () => {
			const res = await app.request('/api/v1/payments/pay-1/reject', {
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
			const res = await app.request('/api/v1/payments/pay-1/reject', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason: '' }),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});

		it('[P1] should reject reason exceeding 500 chars', async () => {
			const res = await app.request('/api/v1/payments/pay-1/reject', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason: 'A'.repeat(501) }),
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(400);
		});
	});

	describe('GET /api/v1/bookings/:bookingId/payments/summary', () => {
		beforeEach(() => {
			const mocks = createMockServices();
			mockPaymentsService = new PaymentsService(mocks.paymentRepo, mocks.bookingRepo);

			app.get('/api/v1/bookings/:bookingId/payments/summary', async (c) => {
				const bookingId = c.req.param('bookingId');
				const result = await mockPaymentsService.getBookingSummary(bookingId);
				return c.json({ success: true, data: result });
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should return payment summary for booking', async () => {
			vi.spyOn(mockPaymentsService, 'getBookingSummary').mockResolvedValue({
				bookingId: 'booking-1',
				bookingNumber: 'SM-001',
				totalAmount: 1500000,
				currency: 'IDR',
				paymentTerms: 'DP_Pickup',
				payments: [
					{ id: 'pay-1', amount: 500000, method: 'QRIS', status: 'Verified', createdAt: new Date().toISOString() },
				],
				summary: {
					totalPaid: 500000,
					pendingAmount: 0,
					remaining: 1000000,
					isFullyPaid: false,
					paymentProgress: 33.33,
				},
			});

			const res = await app.request('/api/v1/bookings/booking-1/payments/summary', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { summary: { totalPaid: number } } };
			expect(body.data.summary.totalPaid).toBe(500000);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should include all payments in summary', async () => {
			vi.spyOn(mockPaymentsService, 'getBookingSummary').mockResolvedValue({
				bookingId: 'booking-1',
				bookingNumber: 'SM-001',
				totalAmount: 1500000,
				currency: 'IDR',
				paymentTerms: 'DP_Pickup',
				payments: [
					{ id: 'pay-1', amount: 500000, method: 'QRIS', status: 'Verified', createdAt: new Date().toISOString() },
					{ id: 'pay-2', amount: 300000, method: 'BankTransfer', status: 'Pending', createdAt: new Date().toISOString() },
				],
				summary: {
					totalPaid: 500000,
					pendingAmount: 300000,
					remaining: 700000,
					isFullyPaid: false,
					paymentProgress: 33.33,
				},
			});

			const res = await app.request('/api/v1/bookings/booking-1/payments/summary', {}, { JWT_SECRET: testJwtSecret } as Env);
			const body = await res.json() as { success: boolean; data: { payments: unknown[] } };

			expect(body.data.payments).toHaveLength(2);
		});

		it('[P1] should return correct payment progress', async () => {
			vi.spyOn(mockPaymentsService, 'getBookingSummary').mockResolvedValue({
				bookingId: 'booking-1',
				bookingNumber: 'SM-001',
				totalAmount: 1000000,
				currency: 'IDR',
				paymentTerms: 'Full_Upfront',
				payments: [
					{ id: 'pay-1', amount: 1000000, method: 'QRIS', status: 'Verified', createdAt: new Date().toISOString() },
				],
				summary: {
					totalPaid: 1000000,
					pendingAmount: 0,
					remaining: 0,
					isFullyPaid: true,
					paymentProgress: 100,
				},
			});

			const res = await app.request('/api/v1/bookings/booking-1/payments/summary', {}, { JWT_SECRET: testJwtSecret } as Env);
			const body = await res.json() as { success: boolean; data: { summary: { paymentProgress: number; isFullyPaid: boolean } } };

			expect(body.data.summary.paymentProgress).toBe(100);
			expect(body.data.summary.isFullyPaid).toBe(true);
		});
	});

	describe('GET /api/v1/payments/pending', () => {
		beforeEach(() => {
			const mocks = createMockServices();
			mockPaymentsService = new PaymentsService(mocks.paymentRepo, mocks.bookingRepo);

			app.get('/api/v1/payments/pending', async (c) => {
				const result = await mockPaymentsService.getPendingPayments();
				return c.json({ success: true, data: result });
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should return all pending payments', async () => {
			vi.spyOn(mockPaymentsService, 'getPendingPayments').mockResolvedValue({
				items: [
					{
						id: 'pay-1',
						booking: {
							id: 'booking-1',
							bookingNumber: 'SM-001',
							customerName: 'John Doe',
							startDate: '2026-03-10',
						},
						amount: 500000,
						method: 'BankTransfer',
						createdAt: new Date().toISOString(),
						daysPending: 2,
					},
				],
				total: 1,
			});

			const res = await app.request('/api/v1/payments/pending', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { items: unknown[]; total: number } };
			expect(body.data.items).toHaveLength(1);
			expect(body.data.total).toBe(1);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should handle empty pending payments', async () => {
			vi.spyOn(mockPaymentsService, 'getPendingPayments').mockResolvedValue({
				items: [],
				total: 0,
			});

			const res = await app.request('/api/v1/payments/pending', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { items: unknown[]; total: number } };
			expect(body.data.items).toHaveLength(0);
			expect(body.data.total).toBe(0);
		});

		it('[P1] should include days pending for each payment', async () => {
			vi.spyOn(mockPaymentsService, 'getPendingPayments').mockResolvedValue({
				items: [
					{
						id: 'pay-1',
						booking: {
							id: 'booking-1',
							bookingNumber: 'SM-001',
							customerName: 'John Doe',
							startDate: '2026-03-10',
						},
						amount: 500000,
						method: 'BankTransfer',
						createdAt: new Date().toISOString(),
						daysPending: 5,
					},
				],
				total: 1,
			});

			const res = await app.request('/api/v1/payments/pending', {}, { JWT_SECRET: testJwtSecret } as Env);
			const body = await res.json() as { success: boolean; data: { items: { daysPending: number }[] } };

			expect(body.data.items[0].daysPending).toBe(5);
		});
	});
});
