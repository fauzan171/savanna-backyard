import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicApiService } from '@/worker/modules/public-api/public-api.service';
import { PublicApiRepository } from '@/worker/modules/public-api/public-api.repository';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { ValidationError } from '@/worker/core/types/errors';
import { createTestVehicle, createTestLead, createTestBooking } from '@test/utils';

describe('PublicApiService', () => {
	let publicApiService: PublicApiService;
	let mockRepo: PublicApiRepository;
	let mockConfigRepo: ConfigRepository;

	beforeEach(() => {
		// Create mock repositories
		mockRepo = {
			createLead: vi.fn(),
			getAvailableVehicles: vi.fn(),
			getActiveVehicles: vi.fn(),
			getVehicleById: vi.fn(),
			getVehicleTypes: vi.fn(),
			isVehicleAvailableForDates: vi.fn().mockResolvedValue(true),
			findBookingByNumber: vi.fn(),
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

	describe('submitLead', () => {
		// ============================================
		// P0: Happy Path - Critical business scenarios
		// ============================================

		it('[P0] should submit lead with valid data', async () => {
			const mockLead = createTestLead({
				name: 'Jane Smith',
				phone: '+6281234567890',
				email: 'jane@example.com',
			});

			vi.mocked(mockRepo.createLead).mockResolvedValue(mockLead);

			const result = await publicApiService.submitLead({
				name: 'Jane Smith',
				phone: '+6281234567890',
				email: 'jane@example.com',
			});

			expect(result.id).toBe(mockLead.id);
			expect(result.status).toBe('New');
		});

		it('[P0] should create lead with default source when not provided', async () => {
			const mockLead = createTestLead({ source: 'Website' });

			vi.mocked(mockRepo.createLead).mockResolvedValue(mockLead);

			await publicApiService.submitLead({
				name: 'Jane Smith',
				phone: '+6281234567890',
			});

			expect(mockRepo.createLead).toHaveBeenCalledWith(
				expect.objectContaining({
					source: 'Website',
				})
			);
		});

		it('[P0] should store message in notes field', async () => {
			const mockLead = createTestLead();

			vi.mocked(mockRepo.createLead).mockResolvedValue(mockLead);

			await publicApiService.submitLead({
				name: 'Jane Smith',
				phone: '+6281234567890',
				message: 'Interested in renting a trail bike',
			});

			expect(mockRepo.createLead).toHaveBeenCalledWith(
				expect.objectContaining({
					notes: 'Interested in renting a trail bike',
				})
			);
		});

		it('[P0] should create lead with New status', async () => {
			const mockLead = createTestLead({ status: 'New' });

			vi.mocked(mockRepo.createLead).mockResolvedValue(mockLead);

			const result = await publicApiService.submitLead({
				name: 'Jane Smith',
				phone: '+6281234567890',
			});

			expect(result.status).toBe('New');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should accept lead without email', async () => {
			const mockLead = createTestLead({ email: null });

			vi.mocked(mockRepo.createLead).mockResolvedValue(mockLead);

			const result = await publicApiService.submitLead({
				name: 'Jane Smith',
				phone: '+6281234567890',
			});

			expect(result.id).toBeDefined();
		});

		it('[P1] should accept lead without message', async () => {
			const mockLead = createTestLead({ notes: null });

			vi.mocked(mockRepo.createLead).mockResolvedValue(mockLead);

			await publicApiService.submitLead({
				name: 'Jane Smith',
				phone: '+6281234567890',
			});

			expect(mockRepo.createLead).toHaveBeenCalledWith(
				expect.objectContaining({
					notes: null,
				})
			);
		});

		it('[P1] should accept all valid sources', async () => {
			const sources = ['WhatsApp', 'Instagram', 'Facebook', 'TikTok', 'Website', 'WalkIn'];

			for (const source of sources) {
				const mockLead = createTestLead({ source });

				vi.mocked(mockRepo.createLead).mockResolvedValue(mockLead);

				await publicApiService.submitLead({
					name: 'Jane Smith',
					phone: '+6281234567890',
					source: source as 'WhatsApp' | 'Instagram' | 'Facebook' | 'TikTok' | 'Website' | 'WalkIn',
				});

				expect(mockRepo.createLead).toHaveBeenCalledWith(
					expect.objectContaining({ source })
				);
			}
		});

		it('[P1] should create lead with Warm priority by default', async () => {
			const mockLead = createTestLead({ priority: 'Warm' });

			vi.mocked(mockRepo.createLead).mockResolvedValue(mockLead);

			await publicApiService.submitLead({
				name: 'Jane Smith',
				phone: '+6281234567890',
			});

			expect(mockRepo.createLead).toHaveBeenCalledWith(
				expect.objectContaining({
					priority: 'Warm',
				})
			);
		});

		it('[P1] should not assign lead to any staff by default', async () => {
			const mockLead = createTestLead({ assignedTo: null });

			vi.mocked(mockRepo.createLead).mockResolvedValue(mockLead);

			await publicApiService.submitLead({
				name: 'Jane Smith',
				phone: '+6281234567890',
			});

			expect(mockRepo.createLead).toHaveBeenCalledWith(
				expect.objectContaining({
					assignedTo: null,
				})
			);
		});
	});

	describe('checkAvailability', () => {
		// ============================================
		// P0: Happy Path - Critical business scenarios
		// ============================================

		it('[P0] should return available vehicles for date range', async () => {
			const mockVehicles = [
				createTestVehicle({ status: 'Available' }),
				createTestVehicle({ status: 'Available' }),
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
				createTestVehicle({ type: 'TrailBike', status: 'Available' }),
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
				createTestVehicle({
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

		it('[P1] should separate maintenance vehicles as unavailable', async () => {
			const mockVehicles = [
				createTestVehicle({ status: 'Available' }),
				createTestVehicle({ status: 'Maintenance' }),
			];

			vi.mocked(mockRepo.getAvailableVehicles).mockResolvedValue(mockVehicles);

			const result = await publicApiService.checkAvailability({
				startDate: '2026-03-01',
				endDate: '2026-03-05',
			});

			expect(result.availableVehicles).toHaveLength(1);
			expect(result.unavailableVehicles).toHaveLength(1);
			expect(result.unavailableVehicles[0].reason).toBe('Under maintenance');
		});

		it('[P1] should handle same-day rental', async () => {
			const mockVehicles = [createTestVehicle({ status: 'Available' })];

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

		it('[P1] should show generic reason for inactive vehicles', async () => {
			const mockVehicles = [
				createTestVehicle({ status: 'Inactive' }),
			];

			vi.mocked(mockRepo.getAvailableVehicles).mockResolvedValue(mockVehicles);

			const result = await publicApiService.checkAvailability({
				startDate: '2026-03-01',
				endDate: '2026-03-05',
			});

			expect(result.unavailableVehicles[0].reason).toBe('Currently unavailable');
		});

		it('[P1] should include photoUrl in available vehicles', async () => {
			const mockVehicles = [
				createTestVehicle({
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
				createTestVehicle({ status: 'Available' }),
				createTestVehicle({ status: 'Available' }),
				createTestVehicle({ status: 'Maintenance' }),
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
				createTestVehicle({ type: 'TrailBike', dailyRateIdr: 450000 }),
				createTestVehicle({ type: 'TrailBike', dailyRateIdr: 350000 }),
				createTestVehicle({ type: 'StreetBike', dailyRateIdr: 300000 }),
			];

			vi.mocked(mockRepo.getActiveVehicles).mockResolvedValue(mockVehicles);

			const result = await publicApiService.getVehicleTypes();

			expect(result.types).toHaveLength(2);
			const trailBike = result.types.find(t => t.type === 'TrailBike');
			expect(trailBike?.count).toBe(2);
		});

		it('[P0] should calculate min and max daily rates', async () => {
			const mockVehicles = [
				createTestVehicle({ type: 'TrailBike', dailyRateIdr: 450000 }),
				createTestVehicle({ type: 'TrailBike', dailyRateIdr: 350000 }),
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
				createTestVehicle({ type: 'TrailBike' }),
				createTestVehicle({ type: 'StreetBike' }),
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
				createTestVehicle({ type: 'StreetBike' }),
				createTestVehicle({ type: 'TrailBike' }),
				createTestVehicle({ type: 'Car' }),
			];

			vi.mocked(mockRepo.getActiveVehicles).mockResolvedValue(mockVehicles);

			const result = await publicApiService.getVehicleTypes();

			const typeNames = result.types.map(t => t.type);
			expect(typeNames).toEqual([...typeNames].sort());
		});

		it('[P1] should handle all vehicle types', async () => {
			const types = ['TrailBike', 'StreetBike', 'Car', 'Jeep', 'Other'];
			const mockVehicles = types.map(type => createTestVehicle({ type: type as 'TrailBike' | 'StreetBike' | 'Car' | 'Jeep' | 'Other' }));

			vi.mocked(mockRepo.getActiveVehicles).mockResolvedValue(mockVehicles);

			const result = await publicApiService.getVehicleTypes();

			expect(result.types).toHaveLength(5);
		});

		it('[P1] should handle single vehicle per type', async () => {
			const mockVehicles = [
				createTestVehicle({ type: 'TrailBike', dailyRateIdr: 450000 }),
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
			const mockVehicle = createTestVehicle({
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
			const mockVehicle = createTestVehicle({
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
			const mockVehicle = createTestVehicle({
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
			const mockVehicle = createTestVehicle({
				brand: null,
				model: null,
				year: null,
				photoUrl: null,
			});

			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(mockVehicle);

			const result = await publicApiService.getVehicleDetails('vehicle-123');

			expect(result?.brand).toBeNull();
			expect(result?.model).toBeNull();
			expect(result?.year).toBeNull();
			expect(result?.image).toBeNull();
		});

		it('[P1] should include specs object', async () => {
			const mockVehicle = createTestVehicle();

			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(mockVehicle);

			const result = await publicApiService.getVehicleDetails('vehicle-123');

			expect(result?.specs).toBeDefined();
		});

		it('[P1] should return dailyRateIdr field', async () => {
			const mockVehicle = createTestVehicle({ dailyRateIdr: 450000 });

			vi.mocked(mockRepo.getVehicleById).mockResolvedValue(mockVehicle);

			const result = await publicApiService.getVehicleDetails('vehicle-123');

			expect(result?.dailyRateIdr).toBe(450000);
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
});
