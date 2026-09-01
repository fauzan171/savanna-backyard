import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicApiService } from '@/worker/modules/public-api/public-api.service';
import { PublicApiRepository } from '@/worker/modules/public-api/public-api.repository';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { ValidationError } from '@/worker/core/types/errors';
import { createTestVehicle, createTestBooking } from '@test/utils';

describe('PublicApiService', () => {
	let publicApiService: PublicApiService;
	let mockRepo: PublicApiRepository;
	let mockConfigRepo: ConfigRepository;

	const createPublicVehicle = (overrides: Record<string, unknown> = {}) =>
		createTestVehicle({
			category: 'Adventure',
			description: 'Curated public fleet bike',
			photoUrl: 'https://example.com/vehicle.jpg',
			...overrides,
		});

	beforeEach(() => {
		// Create mock repositories
		mockRepo = {
			getAvailableVehicles: vi.fn(),
			getActiveVehicles: vi.fn(),
			getPublicVehicles: vi.fn(),
			getActivePackages: vi.fn(),
			getActiveTrails: vi.fn(),
			getVehicleById: vi.fn(),
			getTrailById: vi.fn(),
			getVehicleTypes: vi.fn(),
			getVehicleBookingsInRange: vi.fn(),
			isVehicleAvailableForDates: vi.fn().mockResolvedValue(true),
			findBookingByNumber: vi.fn(),
			findCustomerByPhone: vi.fn(),
		} as unknown as PublicApiRepository;

		mockConfigRepo = {
			getValue: vi.fn(),
			getBoolean: vi.fn(),
			getNumber: vi.fn(),
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
			getAll: vi.fn(),
		} as unknown as ConfigRepository;

		publicApiService = new PublicApiService(mockRepo, mockConfigRepo);
	});

	describe('checkAvailability', () => {
		// ============================================
		// P0: Happy Path - Critical business scenarios
		// ============================================

		it('[P0] should return available vehicles for date range', async () => {
			const mockVehicles = [
				createPublicVehicle({ status: 'Available' }),
				createPublicVehicle({ status: 'Available' }),
			];

			vi.mocked(mockRepo.getAvailableVehicles).mockResolvedValue(mockVehicles);

			const result = await publicApiService.checkAvailability({
				startDate: '2026-03-01',
				endDate: '2026-03-05',
			});

			expect(result.requestedPeriod.startDate).toBe('2026-03-01');
			expect(result.requestedPeriod.endDate).toBe('2026-03-05');
			expect(result.availableVehicles).toHaveLength(2);
		});

		it('[P0] should filter by vehicle type', async () => {
			const mockVehicles = [
				createPublicVehicle({ type: 'TrailBike', status: 'Available' }),
			];

			vi.mocked(mockRepo.getAvailableVehicles).mockResolvedValue(mockVehicles);

			await publicApiService.checkAvailability({
				startDate: '2026-03-01',
				endDate: '2026-03-05',
				type: 'TrailBike',
			});

			expect(mockRepo.getAvailableVehicles).toHaveBeenCalledWith('TrailBike');
		});

		it('[P0] should not expose sensitive vehicle data', async () => {
			const mockVehicles = [
				createPublicVehicle({
					status: 'Available',
					plateNumber: 'B 1234 ABC',
					totalKm: 50000,
				}),
			];

			vi.mocked(mockRepo.getAvailableVehicles).mockResolvedValue(mockVehicles);

			const result = await publicApiService.checkAvailability({
				startDate: '2026-03-01',
				endDate: '2026-03-05',
			});

			const vehicle = result.availableVehicles[0] as Record<string, unknown>;
			expect(vehicle).toHaveProperty('id');
			expect(vehicle).toHaveProperty('name');
			expect(vehicle).toHaveProperty('type');
			expect(vehicle).toHaveProperty('dailyRateIdr');
			expect(vehicle).not.toHaveProperty('plateNumber');
			expect(vehicle).not.toHaveProperty('totalKm');
			expect(vehicle).not.toHaveProperty('status');
			});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw ValidationError when start date > end date', async () => {
			await expect(
				publicApiService.checkAvailability({
					startDate: '2026-03-10',
					endDate: '2026-03-01',
				})
			).rejects.toThrow(ValidationError);

			await expect(
				publicApiService.checkAvailability({
					startDate: '2026-03-10',
					endDate: '2026-03-01',
				})
			).rejects.toThrow('Start date must be before or equal to end date');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should exclude dirty or unpublished vehicles from availability output', async () => {
			const mockVehicles = [
				createPublicVehicle({ status: 'Available', name: 'Honda CRF 150L' }),
				createPublicVehicle({ status: 'Available', name: '' }),
				createPublicVehicle({ status: 'Available', name: 'QA test bike' }),
				createPublicVehicle({ status: 'Available', photoUrl: null }),
			];

			vi.mocked(mockRepo.getAvailableVehicles).mockResolvedValue(mockVehicles);

			const result = await publicApiService.checkAvailability({
				startDate: '2026-03-01',
				endDate: '2026-03-05',
			});

			expect(result.availableVehicles).toHaveLength(1);
			expect(result.availableVehicles[0].name).toBe('Honda CRF 150L');
			expect(result.unavailableVehicles).toHaveLength(0);
		});

		it('[P1] should handle same-day rental', async () => {
			const mockVehicles = [createPublicVehicle({ status: 'Available' })];

			vi.mocked(mockRepo.getAvailableVehicles).mockResolvedValue(mockVehicles);

			const result = await publicApiService.checkAvailability({
				startDate: '2026-03-01',
				endDate: '2026-03-01',
			});

			expect(result.requestedPeriod.startDate).toBe('2026-03-01');
			expect(result.requestedPeriod.endDate).toBe('2026-03-01');
		});

		it('[P1] should return empty arrays when no vehicles available', async () => {
			vi.mocked(mockRepo.getAvailableVehicles).mockResolvedValue([]);

			const result = await publicApiService.checkAvailability({
				startDate: '2026-03-01',
				endDate: '2026-03-05',
			});

			expect(result.availableVehicles).toHaveLength(0);
			expect(result.unavailableVehicles).toHaveLength(0);
			expect(result.totalAvailable).toBe(0);
		});

		it('[P1] should include photoUrl in available vehicles', async () => {
			const mockVehicles = [
				createPublicVehicle({
					status: 'Available',
					photoUrl: 'https://example.com/photo.jpg',
				}),
			];

			vi.mocked(mockRepo.getAvailableVehicles).mockResolvedValue(mockVehicles);

			const result = await publicApiService.checkAvailability({
				startDate: '2026-03-01',
				endDate: '2026-03-05',
			});

			expect(result.availableVehicles[0].photoUrl).toBe('https://example.com/photo.jpg');
		});

		it('[P1] should return totalAvailable count', async () => {
			const mockVehicles = [
				createPublicVehicle({ status: 'Available' }),
				createPublicVehicle({ status: 'Available' }),
				createPublicVehicle({ status: 'Available', name: 'sample bike' }),
			];

			vi.mocked(mockRepo.getAvailableVehicles).mockResolvedValue(mockVehicles);

			const result = await publicApiService.checkAvailability({
				startDate: '2026-03-01',
				endDate: '2026-03-05',
			});

			expect(result.totalAvailable).toBe(2);
		});
	});

	describe('getVehicleTypes', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return vehicle types with counts', async () => {
			const mockVehicles = [
				createPublicVehicle({ type: 'TrailBike', dailyRateIdr: 450000 }),
				createPublicVehicle({ type: 'TrailBike', dailyRateIdr: 350000 }),
				createPublicVehicle({ type: 'StreetBike', dailyRateIdr: 300000 }),
			];

			vi.mocked(mockRepo.getActiveVehicles).mockResolvedValue(mockVehicles);

			const result = await publicApiService.getVehicleTypes();

			expect(result.types).toHaveLength(2);
			const trailBike = result.types.find(t => t.type === 'TrailBike');
			expect(trailBike?.count).toBe(2);
		});

		it('[P0] should calculate min and max daily rates', async () => {
			const mockVehicles = [
				createPublicVehicle({ type: 'TrailBike', dailyRateIdr: 450000 }),
				createPublicVehicle({ type: 'TrailBike', dailyRateIdr: 350000 }),
			];

			vi.mocked(mockRepo.getActiveVehicles).mockResolvedValue(mockVehicles);

			const result = await publicApiService.getVehicleTypes();

			const trailBike = result.types.find(t => t.type === 'TrailBike');
			expect(trailBike?.minDailyRate).toBe(350000);
			expect(trailBike?.maxDailyRate).toBe(450000);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should return display names for vehicle types', async () => {
			const mockVehicles = [
				createPublicVehicle({ type: 'TrailBike' }),
				createPublicVehicle({ type: 'StreetBike' }),
			];

			vi.mocked(mockRepo.getActiveVehicles).mockResolvedValue(mockVehicles);

			const result = await publicApiService.getVehicleTypes();

			const trailBike = result.types.find(t => t.type === 'TrailBike');
			expect(trailBike?.displayName).toBe('Trail Bike');

			const streetBike = result.types.find(t => t.type === 'StreetBike');
			expect(streetBike?.displayName).toBe('Street Bike');
		});

		it('[P1] should handle empty vehicle list', async () => {
			vi.mocked(mockRepo.getActiveVehicles).mockResolvedValue([]);

			const result = await publicApiService.getVehicleTypes();

			expect(result.types).toHaveLength(0);
		});

		it('[P1] should sort types alphabetically', async () => {
			const mockVehicles = [
				createPublicVehicle({ type: 'StreetBike' }),
				createPublicVehicle({ type: 'TrailBike' }),
				createPublicVehicle({ type: 'Car' }),
			];

			vi.mocked(mockRepo.getActiveVehicles).mockResolvedValue(mockVehicles);

			const result = await publicApiService.getVehicleTypes();

			const typeNames = result.types.map(t => t.type);
			expect(typeNames).toEqual([...typeNames].sort());
		});

		it('[P1] should handle all vehicle types', async () => {
			const types = ['TrailBike', 'StreetBike', 'Car', 'Jeep', 'Other'];
			const mockVehicles = types.map(type => createPublicVehicle({ type: type as 'TrailBike' | 'StreetBike' | 'Car' | 'Jeep' | 'Other' }));

			vi.mocked(mockRepo.getActiveVehicles).mockResolvedValue(mockVehicles);

			const result = await publicApiService.getVehicleTypes();

			expect(result.types).toHaveLength(5);
		});

		it('[P1] should handle single vehicle per type', async () => {
			const mockVehicles = [
				createPublicVehicle({ type: 'TrailBike', dailyRateIdr: 450000 }),
			];

			vi.mocked(mockRepo.getActiveVehicles).mockResolvedValue(mockVehicles);

			const result = await publicApiService.getVehicleTypes();

			const trailBike = result.types.find(t => t.type === 'TrailBike');
			expect(trailBike?.count).toBe(1);
			expect(trailBike?.minDailyRate).toBe(450000);
			expect(trailBike?.maxDailyRate).toBe(450000);
		});
	});

	describe('getVehicleDetails', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return vehicle details for valid id', async () => {
			const mockVehicle = createPublicVehicle({
				id: 'vehicle-123',
				name: 'Honda CRF 250L',
				type: 'TrailBike',
				brand: 'Honda',
				model: 'CRF 250L',
				year: 2023,
				dailyRateIdr: 450000,
			});

			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(mockVehicle);

			const result = await publicApiService.getVehicleDetails('vehicle-123');

			expect(result).not.toBeNull();
			expect(result?.id).toBe('vehicle-123');
			expect(result?.name).toBe('Honda CRF 250L');
			expect(result?.type).toBe('TrailBike');
		});

		it('[P0] should filter out sensitive data from response', async () => {
			const mockVehicle = createPublicVehicle({
				plateNumber: 'B 1234 ABC',
				status: 'Available',
				totalKm: 50000,
			});

			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(mockVehicle);

			const result = await publicApiService.getVehicleDetails('vehicle-123');

			expect(result).not.toBeNull();
			expect(result).not.toHaveProperty('plateNumber');
			expect(result).not.toHaveProperty('status');
			expect(result).not.toHaveProperty('totalKm');
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should return null for non-existent vehicle', async () => {
			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(null);

			const result = await publicApiService.getVehicleDetails('nonexistent-id');

			expect(result).toBeNull();
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should include optional fields when present', async () => {
			const mockVehicle = createPublicVehicle({
				brand: 'Honda',
				model: 'CRF 250L',
				year: 2023,
				photoUrl: 'https://example.com/photo.jpg',
			});

			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(mockVehicle);

			const result = await publicApiService.getVehicleDetails('vehicle-123');

			expect(result?.brand).toBe('Honda');
			expect(result?.model).toBe('CRF 250L');
			expect(result?.year).toBe(2023);
			expect(result?.image).toBe('https://example.com/photo.jpg');
		});

		it('[P1] should handle null optional fields', async () => {
			const mockVehicle = createPublicVehicle({
				brand: null,
				model: null,
				year: null,
			});

			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(mockVehicle);

			const result = await publicApiService.getVehicleDetails('vehicle-123');

			expect(result?.brand).toBeNull();
			expect(result?.model).toBeNull();
			expect(result?.year).toBeNull();
			expect(result?.image).toBe('https://example.com/vehicle.jpg');
		});

		it('[P1] should include specs object', async () => {
			const mockVehicle = createPublicVehicle();

			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(mockVehicle);

			const result = await publicApiService.getVehicleDetails('vehicle-123');

			expect(result?.specs).toBeDefined();
		});

		it('[P1] should return dailyRateIdr field', async () => {
			const mockVehicle = createPublicVehicle({ dailyRateIdr: 450000 });

			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(mockVehicle);

			const result = await publicApiService.getVehicleDetails('vehicle-123');

			expect(result?.dailyRateIdr).toBe(450000);
		});

		it('[P1] should return null for non-publishable vehicle details', async () => {
			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(
				createTestVehicle({ name: '', category: null, description: null, photoUrl: null }),
			);

			const result = await publicApiService.getVehicleDetails('vehicle-123');

			expect(result).toBeNull();
		});
	});

	describe('public content publishability filters', () => {
		it('[P0] should exclude dirty vehicles from public catalog', async () => {
			vi.mocked((mockRepo as any).getPublicVehicles).mockResolvedValue([
				createPublicVehicle({ name: 'Honda CRF 150L' }),
				createPublicVehicle({ name: '' }),
				createPublicVehicle({ name: 'beat carbu', category: null }),
				createPublicVehicle({ name: 'mio', description: null }),
				createPublicVehicle({ name: 'QA demo bike' }),
			]);

			const result = await publicApiService.getPublicVehicles();

			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe('Honda CRF 150L');
		});

		it('[P0] should exclude QA packages from public catalog', async () => {
			vi.mocked((mockRepo as any).getActivePackages).mockResolvedValue([
				{
					id: 'pkg-1',
					name: 'Bromo Sunrise Adventure',
					tagline: 'Sunrise ride',
					description: 'Curated package',
					image: '/uploads/pkg.jpg',
					duration: '2D1N',
					distance: '120km',
					groupSize: '1-4',
					price: 1500000,
					trailId: 'trail-1',
					sortOrder: 1,
					isActive: true,
				},
				{
					id: 'pkg-qa',
					name: 'QA-PKG-01',
					tagline: null,
					description: 'QA package',
					image: '/uploads/pkg-qa.jpg',
					duration: '1D',
					distance: null,
					groupSize: null,
					price: 1000,
					trailId: null,
					sortOrder: 2,
					isActive: true,
				},
			]);

			const result = await publicApiService.getPublicPackages();

			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe('Bromo Sunrise Adventure');
		});

		it('[P0] should exclude incomplete or test trails from public catalog', async () => {
			vi.mocked((mockRepo as any).getActiveTrails).mockResolvedValue([
				{
					id: 'trail-1',
					name: 'Bromo Ridge Trail',
					description: 'Scenic volcanic ridge trail',
					terrain: 'Sand and gravel',
					elevation: '2200m',
					difficulty: 'Intermediate',
					recommended: 'Sunrise',
					image: '/uploads/trail.jpg',
					mapImage: '/uploads/trail-map.jpg',
					isActive: true,
					sortOrder: 1,
				},
				{
					id: 'trail-bad',
					name: 'valid-trail-2026',
					description: '',
					terrain: null,
					elevation: null,
					difficulty: null,
					recommended: null,
					image: null,
					mapImage: null,
					isActive: true,
					sortOrder: 2,
				},
				{
					id: 'trail-qa',
					name: 'sample trail',
					description: 'Seed content',
					terrain: 'Sand',
					elevation: null,
					difficulty: 'Easy',
					recommended: 'Morning',
					image: '/uploads/sample.jpg',
					mapImage: null,
					isActive: true,
					sortOrder: 3,
				},
			]);

			const result = await publicApiService.getPublicTrails();

			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe('Bromo Ridge Trail');
		});

		it('[P0] should reject availability calendar for unpublished vehicle', async () => {
			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(
				createTestVehicle({ id: 'veh-bad', name: '', category: null, description: null, photoUrl: null }),
			);

			await expect(
				publicApiService.getVehicleAvailabilityForMonth('veh-bad', '2026-08'),
			).rejects.toThrow('Vehicle not found');
		});
	});

	describe('getBookingStatus', () => {
		// ============================================
		// P0: Critical bug fix — isFullyPaid for full-payment bookings
		// ============================================

		it('[P0] should return isFullyPaid=false for unpaid full-payment booking (BUG regression)', async () => {
			const mockBooking = createTestBooking({
				status: 'pending_payment',
				paymentStatus: 'pending',
				paymentType: 'full',
				paymentTerms: 'Full_Upfront',
				remainingAmount: 0,
				fullyPaidAt: null,
				paidAt: null,
			});

			vi.mocked(mockRepo.findBookingByNumber).mockResolvedValue(mockBooking as any);
			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(createTestVehicle());

			const result = await publicApiService.getBookingStatus('SM-20260101-TEST1');

			expect(result).not.toBeNull();
			expect(result!.isFullyPaid).toBe(false);
			expect(result!.paymentStatus).toBe('pending');
			expect(result!.paymentType).toBe('full');
		});

		it('[P0] should return isFullyPaid=true for paid full-payment booking', async () => {
			const mockBooking = createTestBooking({
				status: 'Confirmed',
				paymentStatus: 'settlement',
				paymentType: 'full',
				paymentTerms: 'Full_Upfront',
				remainingAmount: 0,
				fullyPaidAt: '2026-03-01T10:00:00Z',
				paidAt: '2026-03-01T10:00:00Z',
			});

			vi.mocked(mockRepo.findBookingByNumber).mockResolvedValue(mockBooking as any);
			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(createTestVehicle());

			const result = await publicApiService.getBookingStatus('SM-20260101-TEST1');

			expect(result).not.toBeNull();
			expect(result!.isFullyPaid).toBe(true);
		});

		it('[P0] should return isFullyPaid=false for unpaid DP booking', async () => {
			const mockBooking = createTestBooking({
				status: 'pending_payment',
				paymentStatus: 'pending',
				paymentType: 'dp',
				paymentTerms: 'DP_Pickup',
				remainingAmount: 245000,
				fullyPaidAt: null,
				paidAt: null,
			});

			vi.mocked(mockRepo.findBookingByNumber).mockResolvedValue(mockBooking as any);
			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(createTestVehicle());

			const result = await publicApiService.getBookingStatus('SM-20260101-TEST1');

			expect(result).not.toBeNull();
			expect(result!.isFullyPaid).toBe(false);
			expect(result!.paymentType).toBe('dp');
		});

		it('[P0] should return isFullyPaid=false for DP booking with only DP paid', async () => {
			const mockBooking = createTestBooking({
				status: 'pending_payment',
				paymentStatus: 'dp_paid',
				paymentType: 'dp',
				paymentTerms: 'DP_Pickup',
				remainingAmount: 245000,
				fullyPaidAt: null,
				paidAt: '2026-03-01T10:00:00Z',
			});

			vi.mocked(mockRepo.findBookingByNumber).mockResolvedValue(mockBooking as any);
			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(createTestVehicle());

			const result = await publicApiService.getBookingStatus('SM-20260101-TEST1');

			expect(result).not.toBeNull();
			expect(result!.isFullyPaid).toBe(false);
		});

		it('[P0] should return isFullyPaid=true for fully paid DP booking', async () => {
			const mockBooking = createTestBooking({
				status: 'Confirmed',
				paymentStatus: 'settlement',
				paymentType: 'dp',
				paymentTerms: 'DP_Pickup',
				remainingAmount: 0,
				fullyPaidAt: '2026-03-02T10:00:00Z',
				paidAt: '2026-03-02T10:00:00Z',
			});

			vi.mocked(mockRepo.findBookingByNumber).mockResolvedValue(mockBooking as any);
			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(createTestVehicle());

			const result = await publicApiService.getBookingStatus('SM-20260101-TEST1');

			expect(result).not.toBeNull();
			expect(result!.isFullyPaid).toBe(true);
		});

		it('[P0] should return null for non-existent booking', async () => {
			vi.mocked(mockRepo.findBookingByNumber).mockResolvedValue(null);

			const result = await publicApiService.getBookingStatus('NONEXISTENT');

			expect(result).toBeNull();
		});
	});

	describe('isPublicApiEnabled', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return true when public API is enabled', async () => {
			vi.mocked(mockConfigRepo.getBoolean).mockResolvedValue(true);

			const result = await publicApiService.isPublicApiEnabled();

			expect(result).toBe(true);
			expect(mockConfigRepo.getBoolean).toHaveBeenCalledWith('public_api_enabled', false);
		});

		it('[P0] should return false when public API is disabled', async () => {
			vi.mocked(mockConfigRepo.getBoolean).mockResolvedValue(false);

			const result = await publicApiService.isPublicApiEnabled();

			expect(result).toBe(false);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should default to false when config not set', async () => {
			vi.mocked(mockConfigRepo.getBoolean).mockResolvedValue(false);

			const result = await publicApiService.isPublicApiEnabled();

			expect(result).toBe(false);
		});
	});

	describe('getBookingStatus', () => {
		const makeBooking = (overrides: Record<string, unknown> = {}) => ({
			...createTestBooking({ paymentStatus: 'settlement', remainingAmount: 0 }),
			publicUserId: 'pu-1',
			paymentType: 'dp',
			dpAmount: 225000,
			remainingAmount: 0,
			paymentPageUrl: 'https://checkout.xendit.co/web/abc',
			...overrides,
		});

		it('[P0] returns DP fields and hides paymentPageUrl from anonymous caller', async () => {
			vi.mocked(mockRepo.findBookingByNumber).mockResolvedValue(makeBooking() as never);
			vi.mocked(mockRepo.findCustomerByPhone).mockResolvedValue({ id: 'test-customer-id' } as never);
			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(createTestVehicle({ name: 'Honda CRF 250L' }));

			const result = await publicApiService.getBookingStatus('SVN-2026-0001', '+628123456789');

			expect(result!.paymentType).toBe('dp');
			expect(result!.remainingAmount).toBe(0);
			expect(result!.paidAmount).toBe(result!.totalAmount);
			expect(result!.vehicleName).toBe('Honda CRF 250L');
			expect(result!.isFullyPaid).toBe(true);
			expect(result!.paymentPageUrl).toBeNull();
		});

		it('[P0] sends paymentPageUrl only to the owner session', async () => {
			vi.mocked(mockRepo.findBookingByNumber).mockResolvedValue(makeBooking() as never);
			vi.mocked(mockRepo.findCustomerByPhone).mockResolvedValue({ id: 'test-customer-id' } as never);
			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(createTestVehicle());

			const owner = await publicApiService.getBookingStatus('SVN-2026-0001', '+628123456789', 'pu-1');
			const other = await publicApiService.getBookingStatus('SVN-2026-0001', '+628123456789', 'pu-OTHER');

			expect(owner!.paymentPageUrl).toBe('https://checkout.xendit.co/web/abc');
			expect(other!.paymentPageUrl).toBeNull();
		});

		it('[P0] returns null when phone does not match booking owner', async () => {
			vi.mocked(mockRepo.findBookingByNumber).mockResolvedValue(makeBooking() as never);
			vi.mocked(mockRepo.findCustomerByPhone).mockResolvedValue(null);

			const result = await publicApiService.getBookingStatus('SVN-2026-0001', '+628999999999');

			expect(result).toBeNull();
		});
	});

	describe('createPublicBooking — past start date', () => {
		const bookingRequest = (startDate: string) => ({
			vehicleId: 'test-vehicle-id',
			startDate,
			endDate: '2099-12-31T23:59:00+07:00',
			customerName: 'Budi',
			customerPhone: '+628123456789',
			paymentType: 'full' as const,
		});

		it('[P0] rejects startDate in the past with VALIDATION_ERROR', async () => {
			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(createPublicVehicle() as never);

			await expect(
				publicApiService.createPublicBooking(
					{ vehicleId: 'test-vehicle-id', startDate: '2020-01-01T00:00:00+07:00', endDate: '2099-01-02T00:00:00+07:00', customerName: 'Budi', customerPhone: '+628123456789' } as never,
					{ vendor: 'manual', config: {} },
				),
			).rejects.toThrow('Start date is in the past');
		});

		it('[P1] allows startDate within 5-minute clock-skew margin', async () => {
			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(createPublicVehicle() as never);
			vi.mocked(mockRepo.getVehicleBookingsInRange).mockResolvedValue([]);

			// Downstream deps (createCustomer) unmocked — reaching that failure
			// proves the past-date gate let the request through.
			await expect(
				publicApiService.createPublicBooking(
					{ vehicleId: 'test-vehicle-id', startDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), endDate: '2099-01-02T00:00:00+07:00', customerName: 'Budi', customerPhone: '+628123456789' } as never,
					{ vendor: 'manual', config: {} },
				),
			).rejects.not.toThrow('Start date is in the past');
		});
	});
});
