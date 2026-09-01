import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingsService } from '@/worker/modules/bookings/bookings.service';
import { BookingsRepository } from '@/worker/modules/bookings/bookings.repository';
import { VehiclesRepository } from '@/worker/modules/vehicles/vehicles.repository';
import { CustomersRepository } from '@/worker/modules/customers/customers.repository';
import { ConflictError, NotFoundError, ValidationError, ForbiddenError } from '@/worker/core/types/errors';
import { createTestCustomer, createTestVehicle } from '@test/utils';
import type { Booking, BookingAddon } from '@/worker/core/database/schema';

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
		totalAmount: 1350000,
		currency: 'IDR',
		notes: null,
		createdBy: 'test-user-id',
		cancelledAt: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	};
}

// Helper to create test addon
function createTestAddon(overrides: Partial<BookingAddon> = {}): BookingAddon {
	return {
		id: 'test-addon-id',
		bookingId: 'test-booking-id',
		type: 'SafetyGear',
		description: 'Helmet and jacket',
		amount: 100000,
		isMandatory: true,
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

describe('BookingsService', () => {
	let bookingsService: BookingsService;
	let mockBookingRepo: BookingsRepository;
	let mockVehicleRepo: VehiclesRepository;
	let mockCustomerRepo: CustomersRepository;

	beforeEach(() => {
		// Create mock repositories
		mockBookingRepo = {
			findById: vi.fn(),
			findByBookingNumber: vi.fn(),
			list: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			updateStatus: vi.fn(),
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
			// B5 + BIZ-03: cancel path cancels pending payments and restores
			// held equipment stock — stub so cancel tests don't TypeError.
			cancelPendingPaymentsByBookingId: vi.fn().mockResolvedValue(undefined),
			listBookingEquipment: vi.fn().mockResolvedValue([]),
			restoreEquipmentStock: vi.fn().mockResolvedValue(undefined),
			logStatusChange: vi.fn().mockResolvedValue(undefined),
			getBookingHistory: vi.fn().mockResolvedValue([]),
		} as unknown as BookingsRepository;

		mockVehicleRepo = {
			findById: vi.fn(),
			updateStatus: vi.fn(),
			update: vi.fn(),
			getAvailableVehicles: vi.fn(),
		} as unknown as VehiclesRepository;

		mockCustomerRepo = {
			findById: vi.fn(),
		} as unknown as CustomersRepository;

		bookingsService = new BookingsService(
			mockBookingRepo,
			mockVehicleRepo,
			mockCustomerRepo
		);
	});

	describe('list', () => {
		// ============================================
		// P0: Happy Path - Critical business scenarios
		// ============================================

		it('[P0] should list bookings with pagination', async () => {
			const mockBookings = [
				createTestBooking({ id: 'booking-1' }),
				createTestBooking({ id: 'booking-2' }),
			];

			vi.mocked(mockBookingRepo.list).mockResolvedValue({
				items: mockBookings,
				total: 2,
			});

			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: mockBookings[0],
				customer: createTestCustomer(),
				vehicle: createTestVehicle(),
				creator: null,
			});

			vi.mocked(mockBookingRepo.getPaymentsByBookingId).mockResolvedValue([]);

			const result = await bookingsService.list({ page: 1, limit: 25 });

			expect(result.items).toHaveLength(2);
			expect(result.meta.page).toBe(1);
			expect(result.meta.limit).toBe(25);
			expect(result.meta.total).toBe(2);
			expect(result.meta.totalPages).toBe(1);
		});

		it('[P0] should calculate totalPages correctly', async () => {
			vi.mocked(mockBookingRepo.list).mockResolvedValue({
				items: [],
				total: 100,
			});

			const result = await bookingsService.list({ page: 1, limit: 25 });

			expect(result.meta.totalPages).toBe(4);
		});

		it('[P0] should filter by status', async () => {
			const confirmedBooking = createTestBooking({ status: 'Confirmed' });
			vi.mocked(mockBookingRepo.list).mockResolvedValue({
				items: [confirmedBooking],
				total: 1,
			});

			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: confirmedBooking,
				customer: createTestCustomer(),
				vehicle: createTestVehicle(),
				creator: null,
			});

			vi.mocked(mockBookingRepo.getPaymentsByBookingId).mockResolvedValue([]);

			await bookingsService.list({ page: 1, limit: 25, status: 'Confirmed' });

			expect(mockBookingRepo.list).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'Confirmed' })
			);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should handle empty result set', async () => {
			vi.mocked(mockBookingRepo.list).mockResolvedValue({
				items: [],
				total: 0,
			});

			const result = await bookingsService.list({ page: 1, limit: 25 });

			expect(result.items).toHaveLength(0);
			expect(result.meta.total).toBe(0);
			expect(result.meta.totalPages).toBe(0);
		});

		it('[P1] should handle large page numbers', async () => {
			vi.mocked(mockBookingRepo.list).mockResolvedValue({
				items: [],
				total: 100,
			});

			const result = await bookingsService.list({ page: 100, limit: 25 });

			expect(result.meta.page).toBe(100);
			expect(mockBookingRepo.list).toHaveBeenCalledWith(
				expect.objectContaining({ page: 100 })
			);
		});
	});

	describe('getById', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return booking with full details', async () => {
			const mockBooking = createTestBooking();
			const mockCustomer = createTestCustomer();
			const mockVehicle = createTestVehicle();

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: mockBooking,
				customer: mockCustomer,
				vehicle: mockVehicle,
				creator: { id: 'user-1', name: 'Staff John' },
			});
			vi.mocked(mockBookingRepo.getAddons).mockResolvedValue([]);
			vi.mocked(mockBookingRepo.getPaymentsByBookingId).mockResolvedValue([]);

			const result = await bookingsService.getById(mockBooking.id);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(mockBooking.id);
			expect(result?.bookingNumber).toBe(mockBooking.bookingNumber);
			expect(result?.customer.name).toBe(mockCustomer.name);
			expect(result?.vehicle.name).toBe(mockVehicle.name);
			expect(result?.createdBy?.name).toBe('Staff John');
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should return null when booking not found', async () => {
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(null);

			const result = await bookingsService.getById('nonexistent-id');

			expect(result).toBeNull();
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should return booking with addons', async () => {
			const mockBooking = createTestBooking();
			const mockAddons = [createTestAddon()];

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: mockBooking,
				customer: createTestCustomer(),
				vehicle: createTestVehicle(),
				creator: null,
			});
			vi.mocked(mockBookingRepo.getAddons).mockResolvedValue(mockAddons);
			vi.mocked(mockBookingRepo.getPaymentsByBookingId).mockResolvedValue([]);

			const result = await bookingsService.getById(mockBooking.id);

			expect(result?.addons).toHaveLength(1);
			expect(result?.addons[0].type).toBe('SafetyGear');
			expect(result?.addons[0].amount).toBe(100000);
		});

		it('[P1] should include payment summary', async () => {
			const mockBooking = createTestBooking();

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: mockBooking,
				customer: createTestCustomer(),
				vehicle: createTestVehicle(),
				creator: null,
			});
			vi.mocked(mockBookingRepo.getAddons).mockResolvedValue([]);
			vi.mocked(mockBookingRepo.getPaymentsByBookingId).mockResolvedValue([
				{ id: 'pay-1', amount: 500000, method: 'QRIS', status: 'Verified', createdAt: new Date().toISOString() } as any,
			]);

			const result = await bookingsService.getById(mockBooking.id);

			expect(result?.paymentSummary.totalPaid).toBe(500000);
			expect(result?.paymentSummary.remaining).toBe(850000);
		});
	});

	describe('create', () => {
		// ============================================
		// P0: Happy Path - Critical business scenarios
		// ============================================

		it('[P0] should create booking with valid data', async () => {
			const mockCustomer = createTestCustomer();
			const mockVehicle = createTestVehicle();
			const mockBooking = createTestBooking();

			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(mockCustomer);
			vi.mocked(mockVehicleRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockBookingRepo.findConflictingBookings).mockResolvedValue([]);
			vi.mocked(mockBookingRepo.create).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: mockBooking,
				customer: mockCustomer,
				vehicle: mockVehicle,
				creator: null,
			});

			const result = await bookingsService.create({
				customerId: mockCustomer.id,
				vehicleId: mockVehicle.id,
				startDate: '2026-03-05',
				endDate: '2026-03-08',
				paymentTerms: 'DP_Pickup',
				currency: 'IDR',
			}, 'user-1');

			expect(result.booking).toBeDefined();
			expect(result.booking.status).toBe('Pending');
			expect(result.blacklistWarning).toBeNull();
		});

		it('[P0] should calculate base amount correctly (daily rate x days)', async () => {
			const mockCustomer = createTestCustomer();
			const mockVehicle = createTestVehicle({ dailyRateIdr: 450000 });
			const mockBooking = createTestBooking({
				baseAmount: 1350000, // 450000 * 3 days
				totalAmount: 1350000,
			});

			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(mockCustomer);
			vi.mocked(mockVehicleRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockBookingRepo.findConflictingBookings).mockResolvedValue([]);
			vi.mocked(mockBookingRepo.create).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: mockBooking,
				customer: mockCustomer,
				vehicle: mockVehicle,
				creator: null,
			});

			const result = await bookingsService.create({
				customerId: mockCustomer.id,
				vehicleId: mockVehicle.id,
				startDate: '2026-03-05',
				endDate: '2026-03-08', // 3 days
				paymentTerms: 'DP_Pickup',
				currency: 'IDR',
			}, 'user-1');

			expect(result.booking.baseAmount).toBe(1350000);
		});

		// ============================================
		// P0: Error Cases - Must handle correctly
		// ============================================

		it('[P0] should throw NotFoundError when customer not found', async () => {
			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(null);

			await expect(
				bookingsService.create({
					customerId: 'nonexistent',
					vehicleId: 'vehicle-1',
					startDate: '2026-03-05',
					endDate: '2026-03-08',
					paymentTerms: 'DP_Pickup',
					currency: 'IDR',
				}, 'user-1')
			).rejects.toThrow(NotFoundError);
		});

		it('[P0] should throw NotFoundError when vehicle not found', async () => {
			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(createTestCustomer());
			vi.mocked(mockVehicleRepo.findById).mockResolvedValue(null);

			await expect(
				bookingsService.create({
					customerId: 'customer-1',
					vehicleId: 'nonexistent',
					startDate: '2026-03-05',
					endDate: '2026-03-08',
					paymentTerms: 'DP_Pickup',
					currency: 'IDR',
				}, 'user-1')
			).rejects.toThrow(NotFoundError);
		});

		it('[P0] should throw ConflictError when vehicle is in maintenance', async () => {
			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(createTestCustomer());
			vi.mocked(mockVehicleRepo.findById).mockResolvedValue(
				createTestVehicle({ status: 'Maintenance' })
			);

			await expect(
				bookingsService.create({
					customerId: 'customer-1',
					vehicleId: 'vehicle-1',
					startDate: '2026-03-05',
					endDate: '2026-03-08',
					paymentTerms: 'DP_Pickup',
					currency: 'IDR',
				}, 'user-1')
			).rejects.toThrow(ConflictError);
		});

		it('[P0] should throw ConflictError when vehicle has conflicting booking', async () => {
			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(createTestCustomer());
			vi.mocked(mockVehicleRepo.findById).mockResolvedValue(createTestVehicle());
			vi.mocked(mockBookingRepo.findConflictingBookings).mockResolvedValue([
				createTestBooking({ id: 'conflicting-booking', bookingNumber: 'SM-20260301-XYZ' }),
			]);

			await expect(
				bookingsService.create({
					customerId: 'customer-1',
					vehicleId: 'vehicle-1',
					startDate: '2026-03-05',
					endDate: '2026-03-08',
					paymentTerms: 'DP_Pickup',
					currency: 'IDR',
				}, 'user-1')
			).rejects.toThrow(ConflictError);
		});

		it('[P0] should throw ValidationError when vehicle lacks currency rate', async () => {
			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(createTestCustomer());
			vi.mocked(mockVehicleRepo.findById).mockResolvedValue(
				createTestVehicle({ dailyRateUsd: null, dailyRateIdr: 0 })
			);
			vi.mocked(mockBookingRepo.findConflictingBookings).mockResolvedValue([]);

			await expect(
				bookingsService.create({
					customerId: 'customer-1',
					vehicleId: 'vehicle-1',
					startDate: '2026-03-05',
					endDate: '2026-03-08',
					paymentTerms: 'DP_Pickup',
					currency: 'USD',
				}, 'user-1')
			).rejects.toThrow(ValidationError);
		});

		// ============================================
		// P1: Edge Cases - Important boundary conditions
		// ============================================

		it('[P1] should show blacklist warning but still create booking', async () => {
			const blacklistedCustomer = createTestCustomer({
				isBlacklisted: true,
				blacklistReason: 'Previous late payment',
			});
			const mockVehicle = createTestVehicle();
			const mockBooking = createTestBooking();

			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(blacklistedCustomer);
			vi.mocked(mockVehicleRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockBookingRepo.findConflictingBookings).mockResolvedValue([]);
			vi.mocked(mockBookingRepo.create).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: mockBooking,
				customer: blacklistedCustomer,
				vehicle: mockVehicle,
				creator: null,
			});

			const result = await bookingsService.create({
				customerId: blacklistedCustomer.id,
				vehicleId: mockVehicle.id,
				startDate: '2026-03-05',
				endDate: '2026-03-08',
				paymentTerms: 'DP_Pickup',
				currency: 'IDR',
			}, 'user-1');

			expect(result.booking).toBeDefined();
			expect(result.blacklistWarning).toEqual({
				isBlacklisted: true,
				reason: 'Previous late payment',
			});
		});

		it('[P1] should create booking with addons', async () => {
			const mockCustomer = createTestCustomer();
			const mockVehicle = createTestVehicle();
			const mockBooking = createTestBooking({
				addonsAmount: 150000,
				totalAmount: 1500000,
			});

			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(mockCustomer);
			vi.mocked(mockVehicleRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockBookingRepo.findConflictingBookings).mockResolvedValue([]);
			vi.mocked(mockBookingRepo.create).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.createAddon).mockResolvedValue(createTestAddon());
			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: mockBooking,
				customer: mockCustomer,
				vehicle: mockVehicle,
				creator: null,
			});

			const result = await bookingsService.create({
				customerId: mockCustomer.id,
				vehicleId: mockVehicle.id,
				startDate: '2026-03-05',
				endDate: '2026-03-08',
				paymentTerms: 'DP_Pickup',
				currency: 'IDR',
				addons: [
					{ type: 'SafetyGear', description: 'Helmet', amount: 100000, isMandatory: true },
					{ type: 'PickupDropoff', description: 'Airport', amount: 50000, isMandatory: false },
				],
			}, 'user-1');

			expect(mockBookingRepo.createAddon).toHaveBeenCalledTimes(2);
		});

		it('[P1] should allow same-day start and end (1 day rental)', async () => {
			const mockCustomer = createTestCustomer();
			const mockVehicle = createTestVehicle({ dailyRateIdr: 450000 });
			const mockBooking = createTestBooking({
				startDate: '2026-03-05',
				endDate: '2026-03-05',
				baseAmount: 450000,
				totalAmount: 450000,
			});

			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(mockCustomer);
			vi.mocked(mockVehicleRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockBookingRepo.findConflictingBookings).mockResolvedValue([]);
			vi.mocked(mockBookingRepo.create).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: mockBooking,
				customer: mockCustomer,
				vehicle: mockVehicle,
				creator: null,
			});

			const result = await bookingsService.create({
				customerId: mockCustomer.id,
				vehicleId: mockVehicle.id,
				startDate: '2026-03-05',
				endDate: '2026-03-05',
				paymentTerms: 'DP_Pickup',
				currency: 'IDR',
			}, 'user-1');

			expect(result.booking).toBeDefined();
		});

		it('[P1] should throw ConflictError when vehicle is inactive', async () => {
			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(createTestCustomer());
			vi.mocked(mockVehicleRepo.findById).mockResolvedValue(
				createTestVehicle({ status: 'Inactive' })
			);

			await expect(
				bookingsService.create({
					customerId: 'customer-1',
					vehicleId: 'vehicle-1',
					startDate: '2026-03-05',
					endDate: '2026-03-08',
					paymentTerms: 'DP_Pickup',
					currency: 'IDR',
				}, 'user-1')
			).rejects.toThrow(ConflictError);
		});
	});

	describe('confirm', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should confirm a pending booking', async () => {
			const mockBooking = createTestBooking({ status: 'Pending' });
			const confirmedBooking = { ...mockBooking, status: 'Confirmed' as const };

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.confirm).mockResolvedValue(confirmedBooking);
			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: confirmedBooking,
				customer: createTestCustomer(),
				vehicle: createTestVehicle(),
				creator: null,
			});

			const result = await bookingsService.confirm(mockBooking.id);

			expect(result.status).toBe('Confirmed');
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when booking not found', async () => {
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(null);

			await expect(
				bookingsService.confirm('nonexistent-id')
			).rejects.toThrow(NotFoundError);
		});

		it('[P0] should throw ValidationError for invalid status transition', async () => {
			const completedBooking = createTestBooking({ status: 'Completed' });
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(completedBooking);

			await expect(
				bookingsService.confirm(completedBooking.id)
			).rejects.toThrow(ValidationError);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should not allow confirming already confirmed booking', async () => {
			const confirmedBooking = createTestBooking({ status: 'Confirmed' });
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(confirmedBooking);

			await expect(
				bookingsService.confirm(confirmedBooking.id)
			).rejects.toThrow(ValidationError);
		});

		it('[P1] should not allow confirming cancelled booking', async () => {
			const cancelledBooking = createTestBooking({ status: 'Cancelled' });
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(cancelledBooking);

			await expect(
				bookingsService.confirm(cancelledBooking.id)
			).rejects.toThrow(ValidationError);
		});
	});

	describe('startRental', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should start rental and update vehicle status', async () => {
			const mockBooking = createTestBooking({ status: 'Confirmed' });
			const mockVehicle = createTestVehicle();
			const activeBooking = { ...mockBooking, status: 'Active' as const, startKm: 15000 };

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.startRental).mockResolvedValue(activeBooking);
			vi.mocked(mockVehicleRepo.updateStatus).mockResolvedValue(mockVehicle);
			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: activeBooking,
				customer: createTestCustomer(),
				vehicle: mockVehicle,
				creator: null,
			});

			const result = await bookingsService.startRental(mockBooking.id, {
				startKm: 15000,
			});

			expect(result.status).toBe('Active');
			expect(mockVehicleRepo.updateStatus).toHaveBeenCalledWith(
				mockBooking.vehicleId,
				'Rented'
			);
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw ValidationError for negative startKm', async () => {
			const mockBooking = createTestBooking({ status: 'Confirmed' });
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);

			await expect(
				bookingsService.startRental(mockBooking.id, { startKm: -100 })
			).rejects.toThrow(ValidationError);
		});

		it('[P0] should throw ValidationError when booking is not Confirmed', async () => {
			const pendingBooking = createTestBooking({ status: 'Pending' });
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(pendingBooking);

			await expect(
				bookingsService.startRental(pendingBooking.id, { startKm: 15000 })
			).rejects.toThrow(ValidationError);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should accept zero startKm (new vehicle)', async () => {
			const mockBooking = createTestBooking({ status: 'Confirmed' });
			const activeBooking = { ...mockBooking, status: 'Active' as const, startKm: 0 };

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.startRental).mockResolvedValue(activeBooking);
			vi.mocked(mockVehicleRepo.updateStatus).mockResolvedValue(createTestVehicle());
			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: activeBooking,
				customer: createTestCustomer(),
				vehicle: createTestVehicle(),
				creator: null,
			});

			const result = await bookingsService.startRental(mockBooking.id, { startKm: 0 });

			expect(result.status).toBe('Active');
		});

		it('[P1] should not allow starting an active rental again', async () => {
			const activeBooking = createTestBooking({ status: 'Active' });
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(activeBooking);

			await expect(
				bookingsService.startRental(activeBooking.id, { startKm: 15000 })
			).rejects.toThrow(ValidationError);
		});
	});

	describe('completeRental', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should complete rental on time (no late fee)', async () => {
			const mockBooking = createTestBooking({
				status: 'Active',
				startKm: 15000,
				endDate: '2026-03-08',
			});
			const mockVehicle = createTestVehicle({ dailyRateIdr: 450000 });
			const completedBooking = {
				...mockBooking,
				status: 'Completed' as const,
				actualReturnDate: '2026-03-08',
				endKm: 16000,
				lateFee: 0,
			};

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockVehicleRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockBookingRepo.completeRental).mockResolvedValue(completedBooking);
			vi.mocked(mockVehicleRepo.update).mockResolvedValue(mockVehicle);
			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: completedBooking,
				customer: createTestCustomer(),
				vehicle: mockVehicle,
				creator: null,
			});

			const result = await bookingsService.completeRental(mockBooking.id, {
				actualReturnDate: '2026-03-08',
				endKm: 16000,
			});

			expect(result.status).toBe('Completed');
			expect(result.lateFee).toBe(0);
			expect(result.lateFeeDetails).toBeNull();
			expect(result.vehicleStatus).toBe('Available');
		});

		it('[P0] should calculate late fee for late return', async () => {
			const mockBooking = createTestBooking({
				status: 'Active',
				startKm: 15000,
				endDate: '2026-03-08',
				totalAmount: 1350000,
			});
			const mockVehicle = createTestVehicle({ dailyRateIdr: 450000 });
			const completedBooking = {
				...mockBooking,
				status: 'Completed' as const,
				actualReturnDate: '2026-03-10',
				endKm: 16000,
				lateFee: 675000, // 1 day * 450000 * 1.5
				totalAmount: 2025000,
			};

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockVehicleRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockBookingRepo.completeRental).mockResolvedValue(completedBooking);
			vi.mocked(mockVehicleRepo.update).mockResolvedValue(mockVehicle);
			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: completedBooking,
				customer: createTestCustomer(),
				vehicle: mockVehicle,
				creator: null,
			});

			const result = await bookingsService.completeRental(mockBooking.id, {
				actualReturnDate: '2026-03-10', // 2 days late
				endKm: 16000,
			});

			expect(result.status).toBe('Completed');
			expect(result.lateFee).toBe(675000);
			expect(result.lateFeeDetails).not.toBeNull();
			expect(result.lateFeeDetails?.daysLate).toBe(2);
			expect(result.lateFeeDetails?.multiplier).toBe(1.5);
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when booking not found', async () => {
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(null);

			await expect(
				bookingsService.completeRental('nonexistent', {
					actualReturnDate: '2026-03-08',
					endKm: 16000,
				})
			).rejects.toThrow(NotFoundError);
		});

		it('[P0] should throw ValidationError when startKm not recorded', async () => {
			const mockBooking = createTestBooking({
				status: 'Active',
				startKm: null,
			});
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);

			await expect(
				bookingsService.completeRental(mockBooking.id, {
					actualReturnDate: '2026-03-08',
					endKm: 16000,
				})
			).rejects.toThrow(ValidationError);
		});

		it('[P0] should throw ValidationError when endKm <= startKm', async () => {
			const mockBooking = createTestBooking({
				status: 'Active',
				startKm: 15000,
			});
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);

			await expect(
				bookingsService.completeRental(mockBooking.id, {
					actualReturnDate: '2026-03-08',
					endKm: 15000, // Same as start
				})
			).rejects.toThrow(ValidationError);

			await expect(
				bookingsService.completeRental(mockBooking.id, {
					actualReturnDate: '2026-03-08',
					endKm: 14000, // Less than start
				})
			).rejects.toThrow(ValidationError);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should allow early return (before end date)', async () => {
			const mockBooking = createTestBooking({
				status: 'Active',
				startKm: 15000,
				endDate: '2026-03-10',
				totalAmount: 1350000,
			});
			const mockVehicle = createTestVehicle({ dailyRateIdr: 450000 });
			const completedBooking = {
				...mockBooking,
				status: 'Completed' as const,
				actualReturnDate: '2026-03-08', // 2 days early
				endKm: 16000,
				lateFee: 0,
			};

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockVehicleRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockBookingRepo.completeRental).mockResolvedValue(completedBooking);
			vi.mocked(mockVehicleRepo.update).mockResolvedValue(mockVehicle);
			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: completedBooking,
				customer: createTestCustomer(),
				vehicle: mockVehicle,
				creator: null,
			});

			const result = await bookingsService.completeRental(mockBooking.id, {
				actualReturnDate: '2026-03-08',
				endKm: 16000,
			});

			expect(result.lateFee).toBe(0);
			expect(result.lateFeeDetails).toBeNull();
		});

		it('[P1] should throw ValidationError when already completed', async () => {
			const completedBooking = createTestBooking({
				status: 'Completed',
				startKm: 15000,
				endKm: 16000,
			});
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(completedBooking);

			await expect(
				bookingsService.completeRental(completedBooking.id, {
					actualReturnDate: '2026-03-08',
					endKm: 17000,
				})
			).rejects.toThrow(ValidationError);
		});
	});

	describe('extend', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should extend active rental successfully', async () => {
			const mockBooking = createTestBooking({
				status: 'Active',
				endDate: '2026-03-08',
				totalAmount: 1350000,
			});
			const mockVehicle = createTestVehicle({ dailyRateIdr: 450000 });

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockVehicleRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockBookingRepo.findConflictingBookings).mockResolvedValue([]);
			vi.mocked(mockBookingRepo.extend).mockResolvedValue({
				...mockBooking,
				endDate: '2026-03-10',
				totalAmount: 2250000,
			});

			const result = await bookingsService.extend(mockBooking.id, {
				newEndDate: '2026-03-10',
			});

			expect(result.originalEndDate).toBe('2026-03-08');
			expect(result.newEndDate).toBe('2026-03-10');
			expect(result.additionalBlocks).toBe(4);
			expect(result.additionalAmount).toBe(1800000);
			expect(result.newTotalAmount).toBe(3150000);
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw ValidationError when booking is not Active', async () => {
			const pendingBooking = createTestBooking({ status: 'Pending' });
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(pendingBooking);

			await expect(
				bookingsService.extend(pendingBooking.id, { newEndDate: '2026-03-10' })
			).rejects.toThrow(ValidationError);
		});

		it('[P0] should throw ValidationError when newEndDate is not after current', async () => {
			const activeBooking = createTestBooking({
				status: 'Active',
				endDate: '2026-03-10',
			});
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(activeBooking);

			await expect(
				bookingsService.extend(activeBooking.id, { newEndDate: '2026-03-10' })
			).rejects.toThrow(ValidationError);

			await expect(
				bookingsService.extend(activeBooking.id, { newEndDate: '2026-03-08' })
			).rejects.toThrow(ValidationError);
		});

		it('[P0] should throw ConflictError when extended period has conflict', async () => {
			const mockBooking = createTestBooking({
				status: 'Active',
				endDate: '2026-03-08',
			});

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.findConflictingBookings).mockResolvedValue([
				createTestBooking({ id: 'conflict-1', bookingNumber: 'SM-CONFLICT' }),
			]);

			await expect(
				bookingsService.extend(mockBooking.id, { newEndDate: '2026-03-10' })
			).rejects.toThrow(ConflictError);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should extend by 1 day', async () => {
			const mockBooking = createTestBooking({
				status: 'Active',
				endDate: '2026-03-08',
				totalAmount: 1350000,
			});
			const mockVehicle = createTestVehicle({ dailyRateIdr: 450000 });

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockVehicleRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockBookingRepo.findConflictingBookings).mockResolvedValue([]);
			vi.mocked(mockBookingRepo.extend).mockResolvedValue({
				...mockBooking,
				endDate: '2026-03-09',
				totalAmount: 2250000,
			});

			const result = await bookingsService.extend(mockBooking.id, {
				newEndDate: '2026-03-09',
			});

			expect(result.additionalBlocks).toBe(2);
			expect(result.additionalAmount).toBe(900000);
			expect(result.newTotalAmount).toBe(2250000);
		});
	});

	describe('cancel', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should cancel a pending booking', async () => {
			const mockBooking = createTestBooking({ status: 'Pending' });
			const cancelledBooking = {
				...mockBooking,
				status: 'Cancelled' as const,
				cancelledAt: new Date().toISOString(),
			};

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.update).mockResolvedValue(cancelledBooking);
			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: cancelledBooking,
				customer: createTestCustomer(),
				vehicle: createTestVehicle(),
				creator: null,
			});

			const result = await bookingsService.cancel(mockBooking.id, 'Customer requested');

			expect(result.status).toBe('Cancelled');
		});

		it('[P0] should cancel an active booking and release vehicle', async () => {
			const mockBooking = createTestBooking({ status: 'Active' });
			const mockVehicle = createTestVehicle();
			const cancelledBooking = {
				...mockBooking,
				status: 'Cancelled' as const,
				cancelledAt: new Date().toISOString(),
			};

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockVehicleRepo.updateStatus).mockResolvedValue(mockVehicle);
			vi.mocked(mockBookingRepo.update).mockResolvedValue(cancelledBooking);
			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: cancelledBooking,
				customer: createTestCustomer(),
				vehicle: mockVehicle,
				creator: null,
			});

			const result = await bookingsService.cancel(mockBooking.id, 'Emergency');

			expect(result.status).toBe('Cancelled');
			expect(mockVehicleRepo.updateStatus).toHaveBeenCalledWith(
				mockBooking.vehicleId,
				'Available'
			);
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when booking not found', async () => {
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(null);

			await expect(
				bookingsService.cancel('nonexistent', 'Reason')
			).rejects.toThrow(NotFoundError);
		});

		it('[P0] should throw ValidationError when cancelling completed booking', async () => {
			const completedBooking = createTestBooking({ status: 'Completed' });
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(completedBooking);

			await expect(
				bookingsService.cancel(completedBooking.id, 'Reason')
			).rejects.toThrow(ValidationError);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should not allow cancelling already cancelled booking', async () => {
			const cancelledBooking = createTestBooking({ status: 'Cancelled' });
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(cancelledBooking);

			await expect(
				bookingsService.cancel(cancelledBooking.id, 'Reason')
			).rejects.toThrow(ValidationError);
		});

		it('[P1] should append cancellation reason to notes', async () => {
			const mockBooking = createTestBooking({
				status: 'Pending',
				notes: 'Original notes',
			});
			const cancelledBooking = {
				...mockBooking,
				status: 'Cancelled' as const,
				notes: 'Original notes\n\nCancellation reason: Customer emergency',
				cancelledAt: new Date().toISOString(),
			};

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.update).mockResolvedValue(cancelledBooking);
			vi.mocked(mockBookingRepo.getBookingWithDetails).mockResolvedValue({
				booking: cancelledBooking,
				customer: createTestCustomer(),
				vehicle: createTestVehicle(),
				creator: null,
			});

			await bookingsService.cancel(mockBooking.id, 'Customer emergency');

			expect(mockBookingRepo.update).toHaveBeenCalledWith(
				mockBooking.id,
				expect.objectContaining({
					status: 'Cancelled',
				})
			);
		});
	});

	describe('addAddon', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should add addon to pending booking', async () => {
			const mockBooking = createTestBooking({
				status: 'Pending',
				baseAmount: 1350000,
				addonsAmount: 0,
				totalAmount: 1350000,
			});
			const mockAddon = createTestAddon();

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.createAddon).mockResolvedValue(mockAddon);
			vi.mocked(mockBookingRepo.updateAddonsAmount).mockResolvedValue({
				...mockBooking,
				addonsAmount: 100000,
				totalAmount: 1450000,
			});

			const result = await bookingsService.addAddon(mockBooking.id, {
				type: 'SafetyGear',
				description: 'Helmet and jacket',
				amount: 100000,
				isMandatory: true,
			});

			expect(result.addon.type).toBe('SafetyGear');
			expect(result.newTotalAmount).toBe(1450000);
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when booking not found', async () => {
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(null);

			await expect(
				bookingsService.addAddon('nonexistent', {
					type: 'SafetyGear',
					amount: 100000,
					isMandatory: true,
				})
			).rejects.toThrow(NotFoundError);
		});

		it('[P0] should throw ForbiddenError when booking is completed', async () => {
			const completedBooking = createTestBooking({ status: 'Completed' });
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(completedBooking);

			await expect(
				bookingsService.addAddon(completedBooking.id, {
					type: 'SafetyGear',
					amount: 100000,
					isMandatory: true,
				})
			).rejects.toThrow(ForbiddenError);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should add addon to active booking', async () => {
			const mockBooking = createTestBooking({
				status: 'Active',
				baseAmount: 1350000,
				addonsAmount: 0,
				totalAmount: 1350000,
			});
			const mockAddon = createTestAddon();

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.createAddon).mockResolvedValue(mockAddon);
			vi.mocked(mockBookingRepo.updateAddonsAmount).mockResolvedValue({
				...mockBooking,
				addonsAmount: 100000,
				totalAmount: 1450000,
			});

			const result = await bookingsService.addAddon(mockBooking.id, {
				type: 'SafetyGear',
				amount: 100000,
				isMandatory: true,
			});

			expect(result.addon).toBeDefined();
		});

		it('[P1] should not allow addon on cancelled booking', async () => {
			const cancelledBooking = createTestBooking({ status: 'Cancelled' });
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(cancelledBooking);

			await expect(
				bookingsService.addAddon(cancelledBooking.id, {
					type: 'SafetyGear',
					amount: 100000,
					isMandatory: true,
				})
			).rejects.toThrow(ForbiddenError);
		});
	});

	describe('removeAddon', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should remove addon and recalculate total', async () => {
			const mockBooking = createTestBooking({
				status: 'Pending',
				baseAmount: 1350000,
				addonsAmount: 150000,
				totalAmount: 1500000,
			});
			const mockAddon = createTestAddon({ amount: 100000 });

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.getAddons).mockResolvedValue([mockAddon]);
			vi.mocked(mockBookingRepo.deleteAddon).mockResolvedValue(true);
			vi.mocked(mockBookingRepo.updateAddonsAmount).mockResolvedValue({
				...mockBooking,
				addonsAmount: 50000,
				totalAmount: 1400000,
			});

			const result = await bookingsService.removeAddon(mockBooking.id, mockAddon.id);

			expect(result.removedAddonId).toBe(mockAddon.id);
			expect(result.newTotalAmount).toBe(1400000);
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when addon not found', async () => {
			const mockBooking = createTestBooking({ status: 'Pending' });

			vi.mocked(mockBookingRepo.findById).mockResolvedValue(mockBooking);
			vi.mocked(mockBookingRepo.getAddons).mockResolvedValue([]);

			await expect(
				bookingsService.removeAddon(mockBooking.id, 'nonexistent-addon')
			).rejects.toThrow(NotFoundError);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should not remove addon from completed booking', async () => {
			const completedBooking = createTestBooking({ status: 'Completed' });
			vi.mocked(mockBookingRepo.findById).mockResolvedValue(completedBooking);

			await expect(
				bookingsService.removeAddon(completedBooking.id, 'addon-id')
			).rejects.toThrow(ForbiddenError);
		});
	});

	describe('checkAvailability', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return available vehicles for date range', async () => {
			const mockVehicle = createTestVehicle();

			vi.mocked(mockVehicleRepo.getAvailableVehicles).mockResolvedValue([mockVehicle]);
			vi.mocked(mockBookingRepo.findConflictingBookings).mockResolvedValue([]);

			const result = await bookingsService.checkAvailability({
				startDate: '2026-03-05',
				endDate: '2026-03-08',
			});

			expect(result.availableVehicles).toHaveLength(1);
			expect(result.availableVehicles[0].id).toBe(mockVehicle.id);
		});

		it('[P0] should return unavailable vehicles with conflict info', async () => {
			const mockVehicle = createTestVehicle();
			const conflictingBooking = createTestBooking({ bookingNumber: 'SM-CONFLICT' });

			vi.mocked(mockVehicleRepo.getAvailableVehicles).mockResolvedValue([mockVehicle]);
			vi.mocked(mockBookingRepo.findConflictingBookings).mockResolvedValue([conflictingBooking]);

			const result = await bookingsService.checkAvailability({
				startDate: '2026-03-05',
				endDate: '2026-03-08',
			});

			expect(result.availableVehicles).toHaveLength(0);
			expect(result.unavailableVehicles).toHaveLength(1);
			expect(result.unavailableVehicles[0].conflictingBooking?.bookingNumber).toBe('SM-CONFLICT');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should filter by vehicle type', async () => {
			const mockVehicle = createTestVehicle({ type: 'TrailBike' });

			vi.mocked(mockVehicleRepo.getAvailableVehicles).mockResolvedValue([mockVehicle]);
			vi.mocked(mockBookingRepo.findConflictingBookings).mockResolvedValue([]);

			await bookingsService.checkAvailability({
				startDate: '2026-03-05',
				endDate: '2026-03-08',
				type: 'TrailBike',
			});

			expect(mockVehicleRepo.getAvailableVehicles).toHaveBeenCalledWith('TrailBike');
		});

		it('[P1] should check specific vehicle when vehicleId provided', async () => {
			const mockVehicle = createTestVehicle();

			vi.mocked(mockVehicleRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockBookingRepo.findConflictingBookings).mockResolvedValue([]);

			const result = await bookingsService.checkAvailability({
				startDate: '2026-03-05',
				endDate: '2026-03-08',
				vehicleId: mockVehicle.id,
			});

			expect(result.availableVehicles).toHaveLength(1);
			expect(mockVehicleRepo.getAvailableVehicles).not.toHaveBeenCalled();
		});

		it('[P1] should skip inactive vehicles', async () => {
			const activeVehicle = createTestVehicle({ status: 'Available' });
			const inactiveVehicle = createTestVehicle({ id: 'inactive', status: 'Inactive' });

			vi.mocked(mockVehicleRepo.getAvailableVehicles).mockResolvedValue([activeVehicle, inactiveVehicle]);
			vi.mocked(mockBookingRepo.findConflictingBookings).mockResolvedValue([]);

			const result = await bookingsService.checkAvailability({
				startDate: '2026-03-05',
				endDate: '2026-03-08',
			});

			// Inactive vehicle should be skipped entirely
			expect(result.availableVehicles.some(v => v.id === 'inactive')).toBe(false);
		});

		it('[P1] should list maintenance vehicles separately', async () => {
			const availableVehicle = createTestVehicle({ id: 'available' });
			const maintenanceVehicle = createTestVehicle({ id: 'maintenance', status: 'Maintenance' });

			vi.mocked(mockVehicleRepo.getAvailableVehicles).mockResolvedValue([availableVehicle, maintenanceVehicle]);
			vi.mocked(mockBookingRepo.findConflictingBookings).mockResolvedValue([]);

			const result = await bookingsService.checkAvailability({
				startDate: '2026-03-05',
				endDate: '2026-03-08',
			});

			expect(result.maintenanceVehicles).toHaveLength(1);
			expect(result.maintenanceVehicles[0].id).toBe('maintenance');
		});
	});
});
