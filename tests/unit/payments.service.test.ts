import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentsService } from '@/worker/modules/payments/payments.service';
import { PaymentsRepository } from '@/worker/modules/payments/payments.repository';
import { BookingsRepository } from '@/worker/modules/bookings/bookings.repository';
import { ConflictError, NotFoundError, ValidationError } from '@/worker/core/types/errors';
import type { Payment, Booking } from '@/worker/core/database/schema';

// Helper to create test payment
function createTestPayment(overrides: Partial<Payment> = {}): Payment {
	return {
		id: 'test-payment-id',
		bookingId: 'test-booking-id',
		amount: 500000,
		currency: 'IDR',
		method: 'QRIS',
		status: 'Pending',
		transactionReference: 'TXN-12345',
		verifiedBy: null,
		verifiedAt: null,
		notes: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	};
}

// Helper to create test booking
function createTestBooking(overrides: Partial<Booking> = {}): Booking {
	return {
		id: 'test-booking-id',
		bookingNumber: 'SM-20260301-ABC123',
		customerId: 'test-customer-id',
		vehicleId: 'test-vehicle-id',
		startDate: '2026-03-05',
		endDate: '2026-03-08',
		actualReturnDate: null,
		startKm: null,
		endKm: null,
		status: 'Pending',
		paymentTerms: 'DP_Pickup',
		baseAmount: 1350000,
		addonsAmount: 0,
		lateFee: 0,
		totalAmount: 1500000,
		currency: 'IDR',
		notes: null,
		createdBy: 'test-user-id',
		cancelledAt: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	};
}

describe('PaymentsService', () => {
	let paymentsService: PaymentsService;
	let mockPaymentRepo: PaymentsRepository;
	let mockBookingRepo: BookingsRepository;

	beforeEach(() => {
		// Create mock repositories
		mockPaymentRepo = {
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
		} as unknown as PaymentsRepository;

		mockBookingRepo = {
			findById: vi.fn(),
			confirm: vi.fn(),
			logStatusChange: vi.fn(),
		} as unknown as BookingsRepository;

		paymentsService = new PaymentsService(mockPaymentRepo, mockBookingRepo);
	});

	describe('list', () => {
		// ============================================
		// P0: Happy Path - Critical business scenarios
		// ============================================

		it('[P0] should list payments with pagination', async () => {
			const mockPayments = [
				createTestPayment({ id: 'pay-1' }),
				createTestPayment({ id: 'pay-2' }),
			];

			vi.mocked(mockPaymentRepo.list).mockResolvedValue({
				items: mockPayments,
				total: 2,
			});

			vi.mocked(mockPaymentRepo.getPaymentWithDetails).mockResolvedValue({
				payment: mockPayments[0],
				booking: createTestBooking(),
				customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' },
				vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', brand: 'Honda', model: 'CRF', year: 2023, dailyRateIdr: 450000, dailyRateUsd: null, status: 'Available', totalKm: 1000, photoUrl: null, createdAt: '', updatedAt: '' },
				verifier: null,
			});

			const result = await paymentsService.list({ page: 1, limit: 25 });

			expect(result.items).toHaveLength(2);
			expect(result.meta.page).toBe(1);
			expect(result.meta.limit).toBe(25);
			expect(result.meta.total).toBe(2);
			expect(result.meta.totalPages).toBe(1);
		});

		it('[P0] should calculate totalPages correctly', async () => {
			vi.mocked(mockPaymentRepo.list).mockResolvedValue({
				items: [],
				total: 100,
			});

			const result = await paymentsService.list({ page: 1, limit: 25 });

			expect(result.meta.totalPages).toBe(4);
		});

		it('[P0] should filter by bookingId', async () => {
			vi.mocked(mockPaymentRepo.list).mockResolvedValue({
				items: [],
				total: 0,
			});

			await paymentsService.list({ page: 1, limit: 25, bookingId: 'booking-1' });

			expect(mockPaymentRepo.list).toHaveBeenCalledWith(
				expect.objectContaining({ bookingId: 'booking-1' })
			);
		});

		it('[P0] should filter by status', async () => {
			vi.mocked(mockPaymentRepo.list).mockResolvedValue({
				items: [],
				total: 0,
			});

			await paymentsService.list({ page: 1, limit: 25, status: 'Verified' });

			expect(mockPaymentRepo.list).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'Verified' })
			);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should handle empty result set', async () => {
			vi.mocked(mockPaymentRepo.list).mockResolvedValue({
				items: [],
				total: 0,
			});

			const result = await paymentsService.list({ page: 1, limit: 25 });

			expect(result.items).toHaveLength(0);
			expect(result.meta.total).toBe(0);
			expect(result.meta.totalPages).toBe(0);
		});

		it('[P1] should filter by payment method', async () => {
			vi.mocked(mockPaymentRepo.list).mockResolvedValue({
				items: [],
				total: 0,
			});

			await paymentsService.list({ page: 1, limit: 25, method: 'QRIS' });

			expect(mockPaymentRepo.list).toHaveBeenCalledWith(
				expect.objectContaining({ method: 'QRIS' })
			);
		});

		it('[P1] should filter by date range', async () => {
			vi.mocked(mockPaymentRepo.list).mockResolvedValue({
				items: [],
				total: 0,
			});

			await paymentsService.list({
				page: 1,
				limit: 25,
				dateFrom: '2026-03-01',
				dateTo: '2026-03-31',
			});

			expect(mockPaymentRepo.list).toHaveBeenCalledWith(
				expect.objectContaining({
					dateFrom: '2026-03-01',
					dateTo: '2026-03-31',
				})
			);
		});
	});

	describe('getById', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return payment with full details', async () => {
			const mockPayment = createTestPayment();
			const mockBooking = createTestBooking();

			vi.mocked(mockPaymentRepo.findById).mockResolvedValue(mockPayment);
			vi.mocked(mockPaymentRepo.getPaymentWithDetails).mockResolvedValue({
				payment: mockPayment,
				booking: mockBooking,
				customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' },
				vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', brand: 'Honda', model: 'CRF', year: 2023, dailyRateIdr: 450000, dailyRateUsd: null, status: 'Available', totalKm: 1000, photoUrl: null, createdAt: '', updatedAt: '' },
				verifier: null,
			});

			const result = await paymentsService.getById(mockPayment.id);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(mockPayment.id);
			expect(result?.amount).toBe(500000);
			expect(result?.booking.customer.name).toBe('John Doe');
			expect(result?.booking.vehicle.name).toBe('Honda CRF');
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should return null when payment not found', async () => {
			vi.mocked(mockPaymentRepo.findById).mockResolvedValue(null);

			const result = await paymentsService.getById('nonexistent-id');

			expect(result).toBeNull();
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should return verified payment with verifier info', async () => {
			const mockPayment = createTestPayment({
				status: 'Verified',
				verifiedBy: 'staff-1',
				verifiedAt: '2026-03-01T10:00:00Z',
			});

			vi.mocked(mockPaymentRepo.findById).mockResolvedValue(mockPayment);
			vi.mocked(mockPaymentRepo.getPaymentWithDetails).mockResolvedValue({
				payment: mockPayment,
				booking: createTestBooking(),
				customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' },
				vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', brand: 'Honda', model: 'CRF', year: 2023, dailyRateIdr: 450000, dailyRateUsd: null, status: 'Available', totalKm: 1000, photoUrl: null, createdAt: '', updatedAt: '' },
				verifier: { id: 'staff-1', name: 'Staff John' },
			});

			const result = await paymentsService.getById(mockPayment.id);

			expect(result?.status).toBe('Verified');
			expect(result?.verifiedBy?.name).toBe('Staff John');
			expect(result?.verifiedAt).toBe('2026-03-01T10:00:00Z');
		});

		it('[P1] should include gateway response for verified payment', async () => {
			const mockPayment = createTestPayment({
				status: 'Verified',
				verifiedAt: '2026-03-01T10:00:00Z',
			});

			vi.mocked(mockPaymentRepo.findById).mockResolvedValue(mockPayment);
			vi.mocked(mockPaymentRepo.getPaymentWithDetails).mockResolvedValue({
				payment: mockPayment,
				booking: createTestBooking(),
				customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' },
				vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', brand: 'Honda', model: 'CRF', year: 2023, dailyRateIdr: 450000, dailyRateUsd: null, status: 'Available', totalKm: 1000, photoUrl: null, createdAt: '', updatedAt: '' },
				verifier: null,
			});

			const result = await paymentsService.getById(mockPayment.id);

			expect(result?.gatewayResponse).toBeDefined();
			expect(result?.gatewayResponse?.paidAt).toBe('2026-03-01T10:00:00Z');
		});
	});

	describe('create', () => {
		// ============================================
		// P0: Happy Path - Critical business scenarios
		// ============================================

		it('[P0] should create payment with valid data', async () => {
			const mockBooking = createTestBooking();
			const mockPayment = createTestPayment();

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockPaymentRepo.getByBookingId).mockResolvedValue([]);
			vi.mocked(mockPaymentRepo.create).mockResolvedValue(mockPayment);
			vi.mocked(mockPaymentRepo.getPaymentWithDetails).mockResolvedValue({
				payment: mockPayment,
				booking: mockBooking,
				customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' },
				vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', brand: 'Honda', model: 'CRF', year: 2023, dailyRateIdr: 450000, dailyRateUsd: null, status: 'Available', totalKm: 1000, photoUrl: null, createdAt: '', updatedAt: '' },
				verifier: null,
			});

			const result = await paymentsService.create({
				bookingId: mockBooking.id,
				amount: 500000,
				currency: 'IDR',
				method: 'QRIS',
			});

			expect(result.amount).toBe(500000);
			expect(result.status).toBe('Pending');
			expect(result.method).toBe('QRIS');
		});

		it('[P0] should create payment for different payment methods', async () => {
			const methods: Array<'QRIS' | 'Gateway' | 'BankTransfer' | 'Cash'> = ['QRIS', 'Gateway', 'BankTransfer', 'Cash'];
			const mockBooking = createTestBooking();

			for (const method of methods) {
				const mockPayment = createTestPayment({ method });

				vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
				vi.mocked(mockPaymentRepo.getByBookingId).mockResolvedValue([]);
				vi.mocked(mockPaymentRepo.create).mockResolvedValue(mockPayment);
				vi.mocked(mockPaymentRepo.getPaymentWithDetails).mockResolvedValue({
					payment: mockPayment,
					booking: mockBooking,
					customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' },
					vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', brand: 'Honda', model: 'CRF', year: 2023, dailyRateIdr: 450000, dailyRateUsd: null, status: 'Available', totalKm: 1000, photoUrl: null, createdAt: '', updatedAt: '' },
					verifier: null,
				});

				const result = await paymentsService.create({
					bookingId: mockBooking.id,
					amount: 500000,
					currency: 'IDR',
					method,
				});

				expect(result.method).toBe(method);
			}
		});

		// ============================================
		// P0: Error Cases - Must handle correctly
		// ============================================

		it('[P0] should throw NotFoundError when booking not found', async () => {
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(null);

			await expect(
				paymentsService.create({
					bookingId: 'nonexistent',
					amount: 500000,
					currency: 'IDR',
					method: 'QRIS',
				})
			).rejects.toThrow(NotFoundError);
		});

		it('[P0] should throw ValidationError when currency does not match booking', async () => {
			const mockBooking = createTestBooking({ currency: 'IDR' });
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);

			await expect(
				paymentsService.create({
					bookingId: mockBooking.id,
					amount: 500000,
					currency: 'USD',
					method: 'QRIS',
				})
			).rejects.toThrow(ValidationError);
		});

		it('[P0] should throw ConflictError for duplicate transaction reference', async () => {
			const mockBooking = createTestBooking();
			const existingPayment = createTestPayment({ transactionReference: 'TXN-EXISTING' });

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockPaymentRepo.findByTransactionReference).mockResolvedValue(existingPayment);

			await expect(
				paymentsService.create({
					bookingId: mockBooking.id,
					amount: 500000,
					currency: 'IDR',
					method: 'QRIS',
					transactionReference: 'TXN-EXISTING',
				})
			).rejects.toThrow(ConflictError);
		});

		// ============================================
		// P1: Edge Cases - Important boundary conditions
		// ============================================

		it('[P0] TC-PAY-001: reject admin overpayment (amount > remaining)', async () => {
			const mockBooking = createTestBooking({ totalAmount: 1000000 });

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockPaymentRepo.getByBookingId).mockResolvedValue([]);

			await expect(
				paymentsService.create({
					bookingId: mockBooking.id,
					amount: 1500000, // Exceeds remaining
					currency: 'IDR',
					method: 'QRIS',
				})
			).rejects.toThrow(ValidationError);
			// Nothing must be persisted when the amount is rejected.
			expect(mockPaymentRepo.create).not.toHaveBeenCalled();
		});

		it('[P1] TC-PAY-001: allow gateway overpayment with warning note', async () => {
			const mockBooking = createTestBooking({ totalAmount: 1000000 });
			const mockPayment = createTestPayment({ amount: 1500000 });

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockPaymentRepo.getByBookingId).mockResolvedValue([]);
			vi.mocked(mockPaymentRepo.create).mockResolvedValue(mockPayment);
			vi.mocked(mockPaymentRepo.getPaymentWithDetails).mockResolvedValue({
				payment: mockPayment,
				booking: mockBooking,
				customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' },
				vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', brand: 'Honda', model: 'CRF', year: 2023, dailyRateIdr: 450000, dailyRateUsd: null, status: 'Available', totalKm: 1000, photoUrl: null, createdAt: '', updatedAt: '' },
				verifier: null,
			});

			const result = await paymentsService.create(
				{
					bookingId: mockBooking.id,
					amount: 1500000, // Exceeds remaining, but gateway already captured it
					currency: 'IDR',
					method: 'QRIS',
				},
				{ allowOverpayment: true }
			);

			expect(result.amount).toBe(1500000);
			// Check that overpayment warning was added
			expect(mockPaymentRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					notes: expect.stringContaining('exceeds remaining balance'),
				})
			);
		});

		it('[P1] should allow payment for cancelled booking (with warning)', async () => {
			const cancelledBooking = createTestBooking({ status: 'Cancelled' });
			const mockPayment = createTestPayment();

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(cancelledBooking);
			vi.mocked(mockPaymentRepo.getByBookingId).mockResolvedValue([]);
			vi.mocked(mockPaymentRepo.create).mockResolvedValue(mockPayment);
			vi.mocked(mockPaymentRepo.getPaymentWithDetails).mockResolvedValue({
				payment: mockPayment,
				booking: cancelledBooking,
				customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' },
				vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', brand: 'Honda', model: 'CRF', year: 2023, dailyRateIdr: 450000, dailyRateUsd: null, status: 'Available', totalKm: 1000, photoUrl: null, createdAt: '', updatedAt: '' },
				verifier: null,
			});

			// Should not throw - payments are allowed for cancelled bookings
			const result = await paymentsService.create({
				bookingId: cancelledBooking.id,
				amount: 500000,
				currency: 'IDR',
				method: 'BankTransfer',
			});

			expect(result).toBeDefined();
		});

		it('[P1] should create payment without transaction reference', async () => {
			const mockBooking = createTestBooking();
			const mockPayment = createTestPayment({ transactionReference: null });

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockPaymentRepo.getByBookingId).mockResolvedValue([]);
			vi.mocked(mockPaymentRepo.create).mockResolvedValue(mockPayment);
			vi.mocked(mockPaymentRepo.getPaymentWithDetails).mockResolvedValue({
				payment: mockPayment,
				booking: mockBooking,
				customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' },
				vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', brand: 'Honda', model: 'CRF', year: 2023, dailyRateIdr: 450000, dailyRateUsd: null, status: 'Available', totalKm: 1000, photoUrl: null, createdAt: '', updatedAt: '' },
				verifier: null,
			});

			const result = await paymentsService.create({
				bookingId: mockBooking.id,
				amount: 500000,
				currency: 'IDR',
				method: 'Cash',
			});

			expect(result.transactionReference).toBeNull();
		});

		it('[P1] should calculate remaining balance correctly with existing payments', async () => {
			const mockBooking = createTestBooking({ totalAmount: 1500000 });
			const existingPayments = [
				createTestPayment({ id: 'pay-1', amount: 500000, status: 'Verified' }),
			];

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockPaymentRepo.getByBookingId).mockResolvedValue(existingPayments);
			vi.mocked(mockPaymentRepo.create).mockResolvedValue(
				createTestPayment({ id: 'pay-2', amount: 500000 })
			);
			vi.mocked(mockPaymentRepo.getPaymentWithDetails).mockResolvedValue({
				payment: createTestPayment({ id: 'pay-2', amount: 500000 }),
				booking: mockBooking,
				customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' },
				vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', brand: 'Honda', model: 'CRF', year: 2023, dailyRateIdr: 450000, dailyRateUsd: null, status: 'Available', totalKm: 1000, photoUrl: null, createdAt: '', updatedAt: '' },
				verifier: null,
			});

			await paymentsService.create({
				bookingId: mockBooking.id,
				amount: 500000, // Exact remaining amount (1500000 - 500000 = 1000000)
				currency: 'IDR',
				method: 'QRIS',
			});

			// No overpayment warning should be added
			expect(mockPaymentRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					notes: null,
				})
			);
		});
	});

	describe('verify', () => {
		// ============================================
		// P0: Happy Path - Critical business scenarios
		// ============================================

		it('[P0] should verify pending payment', async () => {
			const mockPayment = createTestPayment({ status: 'Pending' });
			const mockBooking = createTestBooking();

			vi.mocked(mockPaymentRepo.findById).mockResolvedValue(mockPayment);
			vi.mocked(mockPaymentRepo.getPaymentWithDetails).mockResolvedValue({
				payment: mockPayment,
				booking: mockBooking,
				customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' },
				vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', brand: 'Honda', model: 'CRF', year: 2023, dailyRateIdr: 450000, dailyRateUsd: null, status: 'Available', totalKm: 1000, photoUrl: null, createdAt: '', updatedAt: '' },
				verifier: { id: 'staff-1', name: 'Staff John' },
			});
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockPaymentRepo.getByBookingId).mockResolvedValue([mockPayment]);
			vi.mocked(mockPaymentRepo.verify).mockResolvedValue({
				...mockPayment,
				status: 'Verified',
				verifiedBy: 'staff-1',
				verifiedAt: '2026-03-01T10:00:00Z',
			});
			vi.mocked(mockPaymentRepo.getPaymentSummary).mockResolvedValue({
				totalPaid: 500000,
				pendingAmount: 0,
				remaining: 1000000,
				isFullyPaid: false,
				paymentProgress: 33.33,
			});

			const result = await paymentsService.verify(mockPayment.id, 'staff-1', { notes: 'Verified via bank statement' });

			expect(result.status).toBe('Verified');
			expect(result.verifiedBy.id).toBe('staff-1');
			expect(result.paymentSummary.totalPaid).toBe(500000);
		});

		it('[P0] should auto-confirm booking on first verified payment', async () => {
			const mockPayment = createTestPayment({ status: 'Pending' });
			const mockBooking = createTestBooking({ status: 'Pending' });
			const verifiedPayment = { ...mockPayment, status: 'Verified' as const, verifiedBy: 'staff-1', verifiedAt: '2026-03-01T10:00:00Z' };

			vi.mocked(mockPaymentRepo.findById).mockResolvedValue(mockPayment);
			vi.mocked(mockPaymentRepo.getPaymentWithDetails).mockResolvedValue({
				payment: mockPayment,
				booking: mockBooking,
				customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' },
				vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', brand: 'Honda', model: 'CRF', year: 2023, dailyRateIdr: 450000, dailyRateUsd: null, status: 'Available', totalKm: 1000, photoUrl: null, createdAt: '', updatedAt: '' },
				verifier: { id: 'staff-1', name: 'Staff John' },
			});
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			// After verify is called, getByBookingId returns the newly verified payment (1 total)
			vi.mocked(mockPaymentRepo.getByBookingId).mockResolvedValue([verifiedPayment]);
			vi.mocked(mockPaymentRepo.verify).mockResolvedValue(verifiedPayment);
			vi.mocked(mockBookingRepo.confirm).mockResolvedValue({
				...mockBooking,
				status: 'Confirmed',
			});
			vi.mocked(mockPaymentRepo.getPaymentSummary).mockResolvedValue({
				totalPaid: 500000,
				pendingAmount: 0,
				remaining: 1000000,
				isFullyPaid: false,
				paymentProgress: 33.33,
			});

			const result = await paymentsService.verify(mockPayment.id, 'staff-1', {});

			expect(mockBookingRepo.confirm).toHaveBeenCalledWith(mockBooking.id);
			expect(result.bookingStatus).toBe('Confirmed');
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when payment not found', async () => {
			vi.mocked(mockPaymentRepo.findById).mockResolvedValue(null);

			await expect(
				paymentsService.verify('nonexistent', 'staff-1', {})
			).rejects.toThrow(NotFoundError);
		});

		it('[P0] should throw ConflictError when payment is not Pending', async () => {
			const verifiedPayment = createTestPayment({ status: 'Verified' });
			vi.mocked(mockPaymentRepo.findById).mockResolvedValue(verifiedPayment);

			await expect(
				paymentsService.verify(verifiedPayment.id, 'staff-1', {})
			).rejects.toThrow(ConflictError);
		});

		it('[P0] should throw ConflictError when payment is already Failed', async () => {
			const failedPayment = createTestPayment({ status: 'Failed' });
			vi.mocked(mockPaymentRepo.findById).mockResolvedValue(failedPayment);

			await expect(
				paymentsService.verify(failedPayment.id, 'staff-1', {})
			).rejects.toThrow(ConflictError);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should not auto-confirm if booking is already Confirmed', async () => {
			const mockPayment = createTestPayment({ status: 'Pending' });
			const confirmedBooking = createTestBooking({ status: 'Confirmed' });

			vi.mocked(mockPaymentRepo.findById).mockResolvedValue(mockPayment);
			vi.mocked(mockPaymentRepo.getPaymentWithDetails).mockResolvedValue({
				payment: mockPayment,
				booking: confirmedBooking,
				customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' },
				vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', brand: 'Honda', model: 'CRF', year: 2023, dailyRateIdr: 450000, dailyRateUsd: null, status: 'Available', totalKm: 1000, photoUrl: null, createdAt: '', updatedAt: '' },
				verifier: { id: 'staff-1', name: 'Staff John' },
			});
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(confirmedBooking);
			vi.mocked(mockPaymentRepo.getByBookingId).mockResolvedValue([]);
			vi.mocked(mockPaymentRepo.verify).mockResolvedValue({
				...mockPayment,
				status: 'Verified',
				verifiedBy: 'staff-1',
				verifiedAt: '2026-03-01T10:00:00Z',
			});
			vi.mocked(mockPaymentRepo.getPaymentSummary).mockResolvedValue({
				totalPaid: 500000,
				pendingAmount: 0,
				remaining: 1000000,
				isFullyPaid: false,
				paymentProgress: 33.33,
			});

			const result = await paymentsService.verify(mockPayment.id, 'staff-1', {});

			expect(mockBookingRepo.confirm).not.toHaveBeenCalled();
			expect(result.bookingStatus).toBe('Confirmed');
		});

		it('[P1] should not auto-confirm on second verified payment', async () => {
			const mockPayment = createTestPayment({ status: 'Pending', id: 'pay-2' });
			const mockBooking = createTestBooking({ status: 'Pending' });
			const existingVerifiedPayment = createTestPayment({ id: 'pay-1', status: 'Verified' });
			const newlyVerifiedPayment = { ...mockPayment, status: 'Verified' as const, verifiedBy: 'staff-1', verifiedAt: '2026-03-01T10:00:00Z' };

			vi.mocked(mockPaymentRepo.findById).mockResolvedValue(mockPayment);
			vi.mocked(mockPaymentRepo.getPaymentWithDetails).mockResolvedValue({
				payment: mockPayment,
				booking: mockBooking,
				customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' },
				vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', brand: 'Honda', model: 'CRF', year: 2023, dailyRateIdr: 450000, dailyRateUsd: null, status: 'Available', totalKm: 1000, photoUrl: null, createdAt: '', updatedAt: '' },
				verifier: { id: 'staff-1', name: 'Staff John' },
			});
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			// After verify is called, getByBookingId returns both existing and newly verified payments (2 total)
			vi.mocked(mockPaymentRepo.getByBookingId).mockResolvedValue([existingVerifiedPayment, newlyVerifiedPayment]);
			vi.mocked(mockPaymentRepo.verify).mockResolvedValue(newlyVerifiedPayment);
			vi.mocked(mockPaymentRepo.getPaymentSummary).mockResolvedValue({
				totalPaid: 1000000,
				pendingAmount: 0,
				remaining: 500000,
				isFullyPaid: false,
				paymentProgress: 66.67,
			});

			await paymentsService.verify(mockPayment.id, 'staff-1', {});

			// Should not confirm because there are now 2 verified payments (not the first one)
			expect(mockBookingRepo.confirm).not.toHaveBeenCalled();
		});

		it('[P1] should include verification notes', async () => {
			const mockPayment = createTestPayment({ status: 'Pending' });
			const mockBooking = createTestBooking();

			vi.mocked(mockPaymentRepo.findById).mockResolvedValue(mockPayment);
			vi.mocked(mockPaymentRepo.getPaymentWithDetails).mockResolvedValue({
				payment: mockPayment,
				booking: mockBooking,
				customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' },
				vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', brand: 'Honda', model: 'CRF', year: 2023, dailyRateIdr: 450000, dailyRateUsd: null, status: 'Available', totalKm: 1000, photoUrl: null, createdAt: '', updatedAt: '' },
				verifier: { id: 'staff-1', name: 'Staff John' },
			});
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockPaymentRepo.getByBookingId).mockResolvedValue([]);
			vi.mocked(mockPaymentRepo.verify).mockResolvedValue({
				...mockPayment,
				status: 'Verified',
				verifiedBy: 'staff-1',
				verifiedAt: '2026-03-01T10:00:00Z',
				notes: 'Verified via bank statement',
			});
			vi.mocked(mockPaymentRepo.getPaymentSummary).mockResolvedValue({
				totalPaid: 500000,
				pendingAmount: 0,
				remaining: 1000000,
				isFullyPaid: false,
				paymentProgress: 33.33,
			});

			await paymentsService.verify(mockPayment.id, 'staff-1', { notes: 'Verified via bank statement' });

			expect(mockPaymentRepo.verify).toHaveBeenCalledWith(
				mockPayment.id,
				'staff-1',
				'Verified via bank statement'
			);
		});
	});

	describe('reject', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should reject pending payment', async () => {
			const mockPayment = createTestPayment({ status: 'Pending' });
			const rejectedPayment = {
				...mockPayment,
				status: 'Failed' as const,
				notes: 'Invalid transaction reference',
			};

			vi.mocked(mockPaymentRepo.findById).mockResolvedValue(mockPayment);
			vi.mocked(mockPaymentRepo.reject).mockResolvedValue(rejectedPayment);
			vi.mocked(mockPaymentRepo.getPaymentWithDetails).mockResolvedValue({
				payment: rejectedPayment,
				booking: createTestBooking(),
				customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' },
				vehicle: { id: 'veh-1', name: 'Honda CRF', plateNumber: 'B 1234 ABC', type: 'TrailBike', brand: 'Honda', model: 'CRF', year: 2023, dailyRateIdr: 450000, dailyRateUsd: null, status: 'Available', totalKm: 1000, photoUrl: null, createdAt: '', updatedAt: '' },
				verifier: null,
			});

			const result = await paymentsService.reject(mockPayment.id, {
				reason: 'Invalid transaction reference',
			});

			expect(result.status).toBe('Failed');
			expect(result.notes).toBe('Invalid transaction reference');
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when payment not found', async () => {
			vi.mocked(mockPaymentRepo.findById).mockResolvedValue(null);

			await expect(
				paymentsService.reject('nonexistent', { reason: 'Test' })
			).rejects.toThrow(NotFoundError);
		});

		it('[P0] should throw ConflictError when payment is not Pending', async () => {
			const verifiedPayment = createTestPayment({ status: 'Verified' });
			vi.mocked(mockPaymentRepo.findById).mockResolvedValue(verifiedPayment);

			await expect(
				paymentsService.reject(verifiedPayment.id, { reason: 'Test' })
			).rejects.toThrow(ConflictError);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should not reject already rejected payment', async () => {
			const failedPayment = createTestPayment({ status: 'Failed' });
			vi.mocked(mockPaymentRepo.findById).mockResolvedValue(failedPayment);

			await expect(
				paymentsService.reject(failedPayment.id, { reason: 'Test' })
			).rejects.toThrow(ConflictError);
		});
	});

	describe('getBookingSummary', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return payment summary for booking', async () => {
			const mockBooking = createTestBooking();
			const mockPayments = [
				createTestPayment({ id: 'pay-1', amount: 500000, status: 'Verified' }),
				createTestPayment({ id: 'pay-2', amount: 300000, status: 'Pending' }),
			];

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockPaymentRepo.getByBookingId).mockResolvedValue(mockPayments);
			vi.mocked(mockPaymentRepo.getPaymentSummary).mockResolvedValue({
				totalPaid: 500000,
				pendingAmount: 300000,
				remaining: 700000,
				isFullyPaid: false,
				paymentProgress: 33.33,
			});

			const result = await paymentsService.getBookingSummary(mockBooking.id);

			expect(result.bookingId).toBe(mockBooking.id);
			expect(result.bookingNumber).toBe(mockBooking.bookingNumber);
			expect(result.totalAmount).toBe(mockBooking.totalAmount);
			expect(result.payments).toHaveLength(2);
			expect(result.summary.totalPaid).toBe(500000);
			expect(result.summary.pendingAmount).toBe(300000);
			expect(result.summary.remaining).toBe(700000);
			expect(result.summary.isFullyPaid).toBe(false);
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when booking not found', async () => {
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(null);

			await expect(
				paymentsService.getBookingSummary('nonexistent')
			).rejects.toThrow(NotFoundError);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should return correct summary for fully paid booking', async () => {
			const mockBooking = createTestBooking({ totalAmount: 1000000 });
			const mockPayments = [
				createTestPayment({ amount: 1000000, status: 'Verified' }),
			];

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockPaymentRepo.getByBookingId).mockResolvedValue(mockPayments);
			vi.mocked(mockPaymentRepo.getPaymentSummary).mockResolvedValue({
				totalPaid: 1000000,
				pendingAmount: 0,
				remaining: 0,
				isFullyPaid: true,
				paymentProgress: 100,
			});

			const result = await paymentsService.getBookingSummary(mockBooking.id);

			expect(result.summary.isFullyPaid).toBe(true);
			expect(result.summary.remaining).toBe(0);
			expect(result.summary.paymentProgress).toBe(100);
		});

		it('[P1] should handle booking with no payments', async () => {
			const mockBooking = createTestBooking();

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockPaymentRepo.getByBookingId).mockResolvedValue([]);
			vi.mocked(mockPaymentRepo.getPaymentSummary).mockResolvedValue({
				totalPaid: 0,
				pendingAmount: 0,
				remaining: mockBooking.totalAmount,
				isFullyPaid: false,
				paymentProgress: 0,
			});

			const result = await paymentsService.getBookingSummary(mockBooking.id);

			expect(result.payments).toHaveLength(0);
			expect(result.summary.totalPaid).toBe(0);
			expect(result.summary.remaining).toBe(mockBooking.totalAmount);
		});

		it('[P1] should include payment terms in summary', async () => {
			const mockBooking = createTestBooking({ paymentTerms: 'Full_Upfront' });

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockPaymentRepo.getByBookingId).mockResolvedValue([]);
			vi.mocked(mockPaymentRepo.getPaymentSummary).mockResolvedValue({
				totalPaid: 0,
				pendingAmount: 0,
				remaining: mockBooking.totalAmount,
				isFullyPaid: false,
				paymentProgress: 0,
			});

			const result = await paymentsService.getBookingSummary(mockBooking.id);

			expect(result.paymentTerms).toBe('Full_Upfront');
		});
	});

	describe('getPendingPayments', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return all pending payments', async () => {
			const mockPayment = createTestPayment({ status: 'Pending' });
			const mockBooking = createTestBooking();

			vi.mocked(mockPaymentRepo.getPendingPayments).mockResolvedValue([
				{ payment: mockPayment, booking: mockBooking, customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' } },
			]);

			const result = await paymentsService.getPendingPayments();

			expect(result.items).toHaveLength(1);
			expect(result.total).toBe(1);
			expect(result.items[0].booking.customerName).toBe('John Doe');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should calculate days pending correctly', async () => {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 3);
			const mockPayment = createTestPayment({
				status: 'Pending',
				createdAt: yesterday.toISOString(),
			});
			const mockBooking = createTestBooking();

			vi.mocked(mockPaymentRepo.getPendingPayments).mockResolvedValue([
				{ payment: mockPayment, booking: mockBooking, customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' } },
			]);

			const result = await paymentsService.getPendingPayments();

			expect(result.items[0].daysPending).toBe(3);
		});

		it('[P1] should handle empty pending payments', async () => {
			vi.mocked(mockPaymentRepo.getPendingPayments).mockResolvedValue([]);

			const result = await paymentsService.getPendingPayments();

			expect(result.items).toHaveLength(0);
			expect(result.total).toBe(0);
		});

		it('[P1] should include booking start date', async () => {
			const mockPayment = createTestPayment({ status: 'Pending' });
			const mockBooking = createTestBooking({ startDate: '2026-03-10' });

			vi.mocked(mockPaymentRepo.getPendingPayments).mockResolvedValue([
				{ payment: mockPayment, booking: mockBooking, customer: { id: 'cust-1', name: 'John Doe', phone: '+6281234567890', identityType: null, identityNumber: null, identityPhotoUrl: null, email: null, address: null, notes: null, isBlacklisted: false, blacklistReason: null, createdAt: '', updatedAt: '' } },
			]);

			const result = await paymentsService.getPendingPayments();

			expect(result.items[0].booking.startDate).toBe('2026-03-10');
		});
	});

	describe('getStats', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return payment statistics', async () => {
			vi.mocked(mockPaymentRepo.getStats).mockResolvedValue({
				total: 100,
				byStatus: { Pending: 20, Verified: 75, Failed: 5 },
				byMethod: { QRIS: 40, Gateway: 30, BankTransfer: 20, Cash: 10 },
				totalAmount: 50000000,
			});

			const result = await paymentsService.getStats();

			expect(result.total).toBe(100);
			expect(result.byStatus.Pending).toBe(20);
			expect(result.byStatus.Verified).toBe(75);
			expect(result.byMethod.QRIS).toBe(40);
			expect(result.totalAmount).toBe(50000000);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should handle zero payments', async () => {
			vi.mocked(mockPaymentRepo.getStats).mockResolvedValue({
				total: 0,
				byStatus: { Pending: 0, Verified: 0, Failed: 0 },
				byMethod: { QRIS: 0, Gateway: 0, BankTransfer: 0, Cash: 0 },
				totalAmount: 0,
			});

			const result = await paymentsService.getStats();

			expect(result.total).toBe(0);
			expect(result.totalAmount).toBe(0);
		});
	});
});
