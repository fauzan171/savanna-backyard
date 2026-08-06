import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MaintenanceService } from '@/worker/modules/maintenance/maintenance.service';
import { MaintenanceRepository } from '@/worker/modules/maintenance/maintenance.repository';
import { VehiclesRepository } from '@/worker/modules/vehicles/vehicles.repository';
import { BookingsRepository } from '@/worker/modules/bookings/bookings.repository';
import { UserRepository } from '@/worker/modules/auth/auth.repository';
import { NotFoundError, ValidationError, ConflictError } from '@/worker/core/types/errors';
import { createTestVehicle, createTestMaintenance, createTestBooking, createTestUser } from '@test/utils';

describe('MaintenanceService', () => {
	let maintenanceService: MaintenanceService;
	let mockMaintenanceRepo: MaintenanceRepository;
	let mockVehiclesRepo: VehiclesRepository;
	let mockBookingsRepo: BookingsRepository;
	let mockUsersRepo: UserRepository;

	beforeEach(() => {
		// Create mock repositories
		mockMaintenanceRepo = {
			findById: vi.fn(),
			list: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			findByVehicleId: vi.fn(),
			findActiveByVehicleId: vi.fn(),
			findUpcoming: vi.fn(),
			findOverdue: vi.fn(),
			findInProgress: vi.fn(),
			findScheduled: vi.fn(),
			delete: vi.fn(),
		} as unknown as MaintenanceRepository;

		mockVehiclesRepo = {
			findById: vi.fn(),
			updateStatus: vi.fn(),
			createStatusLog: vi.fn(),
		} as unknown as VehiclesRepository;

		mockBookingsRepo = {
			findById: vi.fn(),
			// B4: create() checks booking conflicts when endDate is set.
			findConflictingBookings: vi.fn().mockResolvedValue([]),
		} as unknown as BookingsRepository;

		mockUsersRepo = {
			findById: vi.fn(),
		} as unknown as UserRepository;

		maintenanceService = new MaintenanceService(
			mockMaintenanceRepo,
			mockVehiclesRepo,
			mockBookingsRepo,
			mockUsersRepo
		);
	});

	describe('list', () => {
		// ============================================
		// P0: Happy Path - Critical business scenarios
		// ============================================

		it('[P0] should list maintenance records with pagination', async () => {
			const mockRecords = [
				createTestMaintenance({ description: 'Oil change' }),
				createTestMaintenance({ description: 'Brake inspection' }),
			];

			vi.mocked(mockMaintenanceRepo.list).mockResolvedValue({
				items: mockRecords,
				total: 2,
			});

			const result = await maintenanceService.list({ page: 1, limit: 25 });

			expect(result.items).toHaveLength(2);
			expect(result.meta.page).toBe(1);
			expect(result.meta.limit).toBe(25);
			expect(result.meta.total).toBe(2);
			expect(result.meta.totalPages).toBe(1);
		});

		it('[P0] should filter by status', async () => {
			const scheduledRecord = createTestMaintenance({ status: 'Scheduled' });
			vi.mocked(mockMaintenanceRepo.list).mockResolvedValue({
				items: [scheduledRecord],
				total: 1,
			});

			const result = await maintenanceService.list({ page: 1, limit: 25, status: 'Scheduled' });

			expect(mockMaintenanceRepo.list).toHaveBeenCalledWith({
				page: 1,
				limit: 25,
				status: 'Scheduled',
			});
			expect(result.items[0].status).toBe('Scheduled');
		});

		it('[P0] should filter by type', async () => {
			const damageRecord = createTestMaintenance({ type: 'Damage' });
			vi.mocked(mockMaintenanceRepo.list).mockResolvedValue({
				items: [damageRecord],
				total: 1,
			});

			await maintenanceService.list({ page: 1, limit: 25, type: 'Damage' });

			expect(mockMaintenanceRepo.list).toHaveBeenCalledWith({
				page: 1,
				limit: 25,
				type: 'Damage',
			});
		});

		it('[P0] should filter by vehicleId', async () => {
			vi.mocked(mockMaintenanceRepo.list).mockResolvedValue({
				items: [],
				total: 0,
			});

			await maintenanceService.list({ page: 1, limit: 25, vehicleId: 'vehicle-123' });

			expect(mockMaintenanceRepo.list).toHaveBeenCalledWith({
				page: 1,
				limit: 25,
				vehicleId: 'vehicle-123',
			});
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should handle empty result set', async () => {
			vi.mocked(mockMaintenanceRepo.list).mockResolvedValue({
				items: [],
				total: 0,
			});

			const result = await maintenanceService.list({ page: 1, limit: 25 });

			expect(result.items).toHaveLength(0);
			expect(result.meta.totalPages).toBe(0);
		});

		it('[P1] should handle combined filters', async () => {
			vi.mocked(mockMaintenanceRepo.list).mockResolvedValue({
				items: [],
				total: 0,
			});

			await maintenanceService.list({
				page: 1,
				limit: 25,
				status: 'InProgress',
				type: 'Repair',
				vehicleId: 'vehicle-123',
			});

			expect(mockMaintenanceRepo.list).toHaveBeenCalledWith({
				page: 1,
				limit: 25,
				status: 'InProgress',
				type: 'Repair',
				vehicleId: 'vehicle-123',
			});
		});

		it('[P1] should calculate totalPages correctly with remainder', async () => {
			vi.mocked(mockMaintenanceRepo.list).mockResolvedValue({
				items: [],
				total: 101,
			});

			const result = await maintenanceService.list({ page: 1, limit: 25 });

			expect(result.meta.totalPages).toBe(5); // ceil(101/25) = 5
		});

		it('[P1] should handle all maintenance types in response', async () => {
			const types: Array<'Scheduled' | 'Repair' | 'Damage'> = ['Scheduled', 'Repair', 'Damage'];

			for (const type of types) {
				const record = createTestMaintenance({ type });
				vi.mocked(mockMaintenanceRepo.list).mockResolvedValue({
					items: [record],
					total: 1,
				});

				const result = await maintenanceService.list({ page: 1, limit: 25 });

				expect(result.items[0].type).toBe(type);
			}
		});

		it('[P1] should handle all maintenance statuses in response', async () => {
			const statuses: Array<'Scheduled' | 'InProgress' | 'Completed'> = ['Scheduled', 'InProgress', 'Completed'];

			for (const status of statuses) {
				const record = createTestMaintenance({ status });
				vi.mocked(mockMaintenanceRepo.list).mockResolvedValue({
					items: [record],
					total: 1,
				});

				const result = await maintenanceService.list({ page: 1, limit: 25 });

				expect(result.items[0].status).toBe(status);
			}
		});
	});

	describe('getById', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return maintenance with vehicle details', async () => {
			const mockRecord = createTestMaintenance();
			const mockVehicle = createTestVehicle({ id: mockRecord.vehicleId });

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(mockRecord);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);

			const result = await maintenanceService.getById(mockRecord.id);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(mockRecord.id);
			expect(result?.vehicle).toBeDefined();
			expect(result?.vehicle?.id).toBe(mockVehicle.id);
			expect(result?.vehicle?.name).toBe(mockVehicle.name);
		});

		it('[P0] should return maintenance with booking details when linked', async () => {
			const mockBooking = createTestBooking();
			const mockRecord = createTestMaintenance({ bookingId: mockBooking.id });
			const mockVehicle = createTestVehicle();

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(mockRecord);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockBookingsRepo.findById).mockResolvedValue(mockBooking);

			const result = await maintenanceService.getById(mockRecord.id);

			expect(result?.booking).toBeDefined();
			expect(result?.booking?.id).toBe(mockBooking.id);
			expect(result?.booking?.bookingNumber).toBe(mockBooking.bookingNumber);
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should return null when maintenance not found', async () => {
			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(null);

			const result = await maintenanceService.getById('nonexistent-id');

			expect(result).toBeNull();
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should return maintenance with user details', async () => {
			const mockUser = createTestUser();
			const mockRecord = createTestMaintenance({ createdBy: mockUser.id });
			const mockVehicle = createTestVehicle();

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(mockRecord);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockUsersRepo.findById).mockResolvedValue(mockUser);

			const result = await maintenanceService.getById(mockRecord.id);

			expect(result?.createdByUser).toBeDefined();
			expect(result?.createdByUser?.id).toBe(mockUser.id);
			expect(result?.createdByUser?.name).toBe(mockUser.name);
		});

		it('[P1] should handle maintenance without booking', async () => {
			const mockRecord = createTestMaintenance({ bookingId: null });
			const mockVehicle = createTestVehicle();

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(mockRecord);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);

			const result = await maintenanceService.getById(mockRecord.id);

			expect(result?.booking).toBeNull();
		});

		it('[P1] should handle maintenance with null photos', async () => {
			const mockRecord = createTestMaintenance({ photos: null });
			const mockVehicle = createTestVehicle();

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(mockRecord);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);

			const result = await maintenanceService.getById(mockRecord.id);

			expect(result?.photos).toBeNull();
		});

		it('[P1] should parse photos JSON correctly', async () => {
			const photos = [{ url: 'https://example.com/photo.jpg', caption: 'Damage photo' }];
			const mockRecord = createTestMaintenance({ photos: JSON.stringify(photos) as unknown as null });
			const mockVehicle = createTestVehicle();

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(mockRecord);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);

			const result = await maintenanceService.getById(mockRecord.id);

			expect(result?.photos).toEqual(photos);
		});
	});

	describe('create', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should create maintenance with valid data', async () => {
			const mockVehicle = createTestVehicle({ status: 'Available' });
			const mockRecord = createTestMaintenance({
				vehicleId: mockVehicle.id,
				type: 'Scheduled',
				description: 'Oil change and filter replacement',
			});

			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockMaintenanceRepo.findActiveByVehicleId).mockResolvedValue(null);
			vi.mocked(mockMaintenanceRepo.create).mockResolvedValue(mockRecord);
			vi.mocked(mockVehiclesRepo.updateStatus).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.createStatusLog).mockResolvedValue(undefined);

			const result = await maintenanceService.create({
				vehicleId: mockVehicle.id,
				type: 'Scheduled',
				description: 'Oil change and filter replacement',
				startDate: '2026-03-05',
			}, 'user-1');

			expect(result.maintenance.type).toBe('Scheduled');
			expect(result.maintenance.description).toBe('Oil change and filter replacement');
			expect(result.vehicleStatusUpdate.statusFrom).toBe('Available');
			expect(result.vehicleStatusUpdate.statusTo).toBe('Maintenance');
		});

		it('[P0] should update vehicle status to Maintenance on create', async () => {
			const mockVehicle = createTestVehicle({ status: 'Available' });
			const mockRecord = createTestMaintenance({ vehicleId: mockVehicle.id });

			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockMaintenanceRepo.findActiveByVehicleId).mockResolvedValue(null);
			vi.mocked(mockMaintenanceRepo.create).mockResolvedValue(mockRecord);
			vi.mocked(mockVehiclesRepo.updateStatus).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.createStatusLog).mockResolvedValue(undefined);

			await maintenanceService.create({
				vehicleId: mockVehicle.id,
				type: 'Scheduled',
				description: 'Test maintenance',
				startDate: '2026-03-05',
			}, 'user-1');

			expect(mockVehiclesRepo.updateStatus).toHaveBeenCalledWith(mockVehicle.id, 'Maintenance');
		});

		it('[P0] should create status log for vehicle status change', async () => {
			const mockVehicle = createTestVehicle({ status: 'Available' });
			const mockRecord = createTestMaintenance({ vehicleId: mockVehicle.id });

			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockMaintenanceRepo.findActiveByVehicleId).mockResolvedValue(null);
			vi.mocked(mockMaintenanceRepo.create).mockResolvedValue(mockRecord);
			vi.mocked(mockVehiclesRepo.updateStatus).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.createStatusLog).mockResolvedValue(undefined);

			await maintenanceService.create({
				vehicleId: mockVehicle.id,
				type: 'Scheduled',
				description: 'Test maintenance',
				startDate: '2026-03-05',
			}, 'user-1');

			expect(mockVehiclesRepo.createStatusLog).toHaveBeenCalledWith(
				expect.objectContaining({
					vehicleId: mockVehicle.id,
					statusFrom: 'Available',
					statusTo: 'Maintenance',
					recordedBy: 'user-1',
				})
			);
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when vehicle not found', async () => {
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(null);

			await expect(
				maintenanceService.create({
					vehicleId: 'nonexistent-id',
					type: 'Scheduled',
					description: 'Test maintenance',
					startDate: '2026-03-05',
				}, 'user-1')
			).rejects.toThrow(NotFoundError);
		});

		it('[P0] should throw ConflictError when vehicle already has active maintenance', async () => {
			const mockVehicle = createTestVehicle();
			const existingMaintenance = createTestMaintenance({ vehicleId: mockVehicle.id, status: 'InProgress' });

			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockMaintenanceRepo.findActiveByVehicleId).mockResolvedValue(existingMaintenance);

			await expect(
				maintenanceService.create({
					vehicleId: mockVehicle.id,
					type: 'Scheduled',
					description: 'Test maintenance',
					startDate: '2026-03-05',
				}, 'user-1')
			).rejects.toThrow(ConflictError);

			await expect(
				maintenanceService.create({
					vehicleId: mockVehicle.id,
					type: 'Scheduled',
					description: 'Test maintenance',
					startDate: '2026-03-05',
				}, 'user-1')
			).rejects.toThrow('Vehicle already has active maintenance');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should create maintenance with all optional fields', async () => {
			const mockVehicle = createTestVehicle();
			const mockBooking = createTestBooking();
			const photos = [{ url: 'https://example.com/photo.jpg', caption: 'Damage photo' }];
			const mockRecord = createTestMaintenance({
				vehicleId: mockVehicle.id,
				bookingId: mockBooking.id,
				cost: 750000,
				endDate: '2026-03-10',
				photos: JSON.stringify(photos) as unknown as null,
			});

			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockMaintenanceRepo.findActiveByVehicleId).mockResolvedValue(null);
			vi.mocked(mockMaintenanceRepo.create).mockResolvedValue(mockRecord);
			vi.mocked(mockVehiclesRepo.updateStatus).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.createStatusLog).mockResolvedValue(undefined);

			const result = await maintenanceService.create({
				vehicleId: mockVehicle.id,
				type: 'Damage',
				description: 'Scratched fairing',
				startDate: '2026-03-05',
				endDate: '2026-03-10',
				cost: 750000,
				bookingId: mockBooking.id,
				photos,
			}, 'user-1');

			expect(result.maintenance.cost).toBe(750000);
			expect(result.maintenance.endDate).toBe('2026-03-10');
		});

		it('[P1] should default cost to 0 when not provided', async () => {
			const mockVehicle = createTestVehicle();
			const mockRecord = createTestMaintenance({ vehicleId: mockVehicle.id, cost: 0 });

			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockMaintenanceRepo.findActiveByVehicleId).mockResolvedValue(null);
			vi.mocked(mockMaintenanceRepo.create).mockResolvedValue(mockRecord);
			vi.mocked(mockVehiclesRepo.updateStatus).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.createStatusLog).mockResolvedValue(undefined);

			await maintenanceService.create({
				vehicleId: mockVehicle.id,
				type: 'Scheduled',
				description: 'Test maintenance',
				startDate: '2026-03-05',
			}, 'user-1');

			expect(mockMaintenanceRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					cost: 0,
				})
			);
		});

		it('[P1] should default status to Scheduled', async () => {
			const mockVehicle = createTestVehicle();
			const mockRecord = createTestMaintenance({ vehicleId: mockVehicle.id });

			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockMaintenanceRepo.findActiveByVehicleId).mockResolvedValue(null);
			vi.mocked(mockMaintenanceRepo.create).mockResolvedValue(mockRecord);
			vi.mocked(mockVehiclesRepo.updateStatus).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.createStatusLog).mockResolvedValue(undefined);

			await maintenanceService.create({
				vehicleId: mockVehicle.id,
				type: 'Scheduled',
				description: 'Test maintenance',
				startDate: '2026-03-05',
			}, 'user-1');

			expect(mockMaintenanceRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'Scheduled',
				})
			);
		});

		it('[P1] should handle all maintenance types', async () => {
			const types: Array<'Scheduled' | 'Repair' | 'Damage'> = ['Scheduled', 'Repair', 'Damage'];

			for (const type of types) {
				const mockVehicle = createTestVehicle();
				const mockRecord = createTestMaintenance({ vehicleId: mockVehicle.id, type });

				vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
				vi.mocked(mockMaintenanceRepo.findActiveByVehicleId).mockResolvedValue(null);
				vi.mocked(mockMaintenanceRepo.create).mockResolvedValue(mockRecord);
				vi.mocked(mockVehiclesRepo.updateStatus).mockResolvedValue(mockVehicle);
				vi.mocked(mockVehiclesRepo.createStatusLog).mockResolvedValue(undefined);

				const result = await maintenanceService.create({
					vehicleId: mockVehicle.id,
					type,
					description: `Test ${type} maintenance`,
					startDate: '2026-03-05',
				}, 'user-1');

				expect(result.maintenance.type).toBe(type);
			}
		});
	});

	describe('update', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should update maintenance successfully', async () => {
			const existingRecord = createTestMaintenance({ status: 'Scheduled' });
			const updatedRecord = { ...existingRecord, description: 'Updated description' };

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(existingRecord);
			vi.mocked(mockMaintenanceRepo.update).mockResolvedValue(updatedRecord);

			const result = await maintenanceService.update(existingRecord.id, {
				description: 'Updated description',
			});

			expect(result.description).toBe('Updated description');
		});

		it('[P0] should update cost', async () => {
			const existingRecord = createTestMaintenance({ cost: 500000 });
			const updatedRecord = { ...existingRecord, cost: 750000 };

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(existingRecord);
			vi.mocked(mockMaintenanceRepo.update).mockResolvedValue(updatedRecord);

			const result = await maintenanceService.update(existingRecord.id, {
				cost: 750000,
			});

			expect(result.cost).toBe(750000);
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when maintenance not found', async () => {
			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(null);

			await expect(
				maintenanceService.update('nonexistent-id', { description: 'New description' })
			).rejects.toThrow(NotFoundError);
		});

		it('[P0] should throw ValidationError when updating completed maintenance', async () => {
			const completedRecord = createTestMaintenance({ status: 'Completed' });
			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(completedRecord);

			await expect(
				maintenanceService.update(completedRecord.id, { description: 'New description' })
			).rejects.toThrow(ValidationError);

			await expect(
				maintenanceService.update(completedRecord.id, { description: 'New description' })
			).rejects.toThrow('Cannot update completed maintenance records');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should allow updating InProgress maintenance', async () => {
			const inProgressRecord = createTestMaintenance({ status: 'InProgress' });
			const updatedRecord = { ...inProgressRecord, cost: 800000 };

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(inProgressRecord);
			vi.mocked(mockMaintenanceRepo.update).mockResolvedValue(updatedRecord);

			const result = await maintenanceService.update(inProgressRecord.id, {
				cost: 800000,
			});

			expect(result.cost).toBe(800000);
		});

		it('[P1] should serialize photos to JSON when provided', async () => {
			const existingRecord = createTestMaintenance({ status: 'Scheduled' });
			const photos = [{ url: 'https://example.com/new-photo.jpg' }];
			const updatedRecord = { ...existingRecord, photos: JSON.stringify(photos) as unknown as null };

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(existingRecord);
			vi.mocked(mockMaintenanceRepo.update).mockResolvedValue(updatedRecord);

			await maintenanceService.update(existingRecord.id, { photos });

			expect(mockMaintenanceRepo.update).toHaveBeenCalledWith(
				existingRecord.id,
				expect.objectContaining({
					photos: JSON.stringify(photos),
				})
			);
		});
	});

	describe('start', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should transition from Scheduled to InProgress', async () => {
			const mockRecord = createTestMaintenance({ status: 'Scheduled' });
			const mockVehicle = createTestVehicle();
			const updatedRecord = { ...mockRecord, status: 'InProgress' as const };

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(mockRecord);
			vi.mocked(mockMaintenanceRepo.update).mockResolvedValue(updatedRecord);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.createStatusLog).mockResolvedValue(undefined);

			const result = await maintenanceService.start(mockRecord.id, 'user-1');

			expect(result.status).toBe('InProgress');
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when maintenance not found', async () => {
			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(null);

			await expect(
				maintenanceService.start('nonexistent-id', 'user-1')
			).rejects.toThrow(NotFoundError);
		});

		it('[P0] should throw ValidationError when not in Scheduled status', async () => {
			const inProgressRecord = createTestMaintenance({ status: 'InProgress' });
			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(inProgressRecord);

			await expect(
				maintenanceService.start(inProgressRecord.id, 'user-1')
			).rejects.toThrow(ValidationError);

			await expect(
				maintenanceService.start(inProgressRecord.id, 'user-1')
			).rejects.toThrow('Maintenance can only be started from Scheduled status');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should create vehicle status log when starting', async () => {
			const mockRecord = createTestMaintenance({ status: 'Scheduled' });
			const mockVehicle = createTestVehicle();
			const updatedRecord = { ...mockRecord, status: 'InProgress' as const };

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(mockRecord);
			vi.mocked(mockMaintenanceRepo.update).mockResolvedValue(updatedRecord);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.createStatusLog).mockResolvedValue(undefined);

			await maintenanceService.start(mockRecord.id, 'user-1');

			expect(mockVehiclesRepo.createStatusLog).toHaveBeenCalled();
		});

		it('[P1] should throw ValidationError when already completed', async () => {
			const completedRecord = createTestMaintenance({ status: 'Completed' });
			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(completedRecord);

			await expect(
				maintenanceService.start(completedRecord.id, 'user-1')
			).rejects.toThrow(ValidationError);
		});
	});

	describe('complete', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should transition from InProgress to Completed', async () => {
			const mockRecord = createTestMaintenance({ status: 'InProgress' });
			const mockVehicle = createTestVehicle();
			const updatedRecord = { ...mockRecord, status: 'Completed' as const };

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(mockRecord);
			vi.mocked(mockMaintenanceRepo.update).mockResolvedValue(updatedRecord);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.updateStatus).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.createStatusLog).mockResolvedValue(undefined);

			const result = await maintenanceService.complete(mockRecord.id, {}, 'user-1');

			expect(result.maintenance.status).toBe('Completed');
		});

		it('[P0] should update vehicle status to Available on complete', async () => {
			const mockRecord = createTestMaintenance({ status: 'InProgress' });
			const mockVehicle = createTestVehicle();
			const updatedRecord = { ...mockRecord, status: 'Completed' as const };

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(mockRecord);
			vi.mocked(mockMaintenanceRepo.update).mockResolvedValue(updatedRecord);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.updateStatus).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.createStatusLog).mockResolvedValue(undefined);

			await maintenanceService.complete(mockRecord.id, {}, 'user-1');

			expect(mockVehiclesRepo.updateStatus).toHaveBeenCalledWith(mockRecord.vehicleId, 'Available');
		});

		it('[P0] should update actual cost when provided', async () => {
			const mockRecord = createTestMaintenance({ status: 'InProgress', cost: 500000 });
			const mockVehicle = createTestVehicle();
			const updatedRecord = { ...mockRecord, status: 'Completed' as const, cost: 620000 };

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(mockRecord);
			vi.mocked(mockMaintenanceRepo.update).mockResolvedValue(updatedRecord);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.updateStatus).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.createStatusLog).mockResolvedValue(undefined);

			const result = await maintenanceService.complete(mockRecord.id, { actualCost: 620000 }, 'user-1');

			expect(result.maintenance.cost).toBe(620000);
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when maintenance not found', async () => {
			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(null);

			await expect(
				maintenanceService.complete('nonexistent-id', {}, 'user-1')
			).rejects.toThrow(NotFoundError);
		});

		it('[P0] should throw ValidationError when already completed', async () => {
			const completedRecord = createTestMaintenance({ status: 'Completed' });
			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(completedRecord);

			await expect(
				maintenanceService.complete(completedRecord.id, {}, 'user-1')
			).rejects.toThrow(ValidationError);

			await expect(
				maintenanceService.complete(completedRecord.id, {}, 'user-1')
			).rejects.toThrow('Maintenance is already completed');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should allow completing from Scheduled status', async () => {
			const mockRecord = createTestMaintenance({ status: 'Scheduled' });
			const mockVehicle = createTestVehicle();
			const updatedRecord = { ...mockRecord, status: 'Completed' as const };

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(mockRecord);
			vi.mocked(mockMaintenanceRepo.update).mockResolvedValue(updatedRecord);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.updateStatus).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.createStatusLog).mockResolvedValue(undefined);

			const result = await maintenanceService.complete(mockRecord.id, {}, 'user-1');

			expect(result.maintenance.status).toBe('Completed');
		});

		it('[P1] should set endDate to today if not set', async () => {
			const mockRecord = createTestMaintenance({ status: 'InProgress', endDate: null });
			const mockVehicle = createTestVehicle();
			const updatedRecord = { ...mockRecord, status: 'Completed' as const };

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(mockRecord);
			vi.mocked(mockMaintenanceRepo.update).mockResolvedValue(updatedRecord);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.updateStatus).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.createStatusLog).mockResolvedValue(undefined);

			await maintenanceService.complete(mockRecord.id, {}, 'user-1');

			const today = new Date().toISOString().split('T')[0];
			expect(mockMaintenanceRepo.update).toHaveBeenCalledWith(
				mockRecord.id,
				expect.objectContaining({
					endDate: today,
				})
			);
		});

		it('[P1] should return vehicleStatusUpdate in result', async () => {
			const mockRecord = createTestMaintenance({ status: 'InProgress' });
			const mockVehicle = createTestVehicle();
			const updatedRecord = { ...mockRecord, status: 'Completed' as const };

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(mockRecord);
			vi.mocked(mockMaintenanceRepo.update).mockResolvedValue(updatedRecord);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.updateStatus).mockResolvedValue(mockVehicle);
			vi.mocked(mockVehiclesRepo.createStatusLog).mockResolvedValue(undefined);

			const result = await maintenanceService.complete(mockRecord.id, {}, 'user-1');

			expect(result.vehicleStatusUpdate.statusFrom).toBe('Maintenance');
			expect(result.vehicleStatusUpdate.statusTo).toBe('Available');
		});

		it('[P0] should throw NotFoundError when vehicle not found on complete', async () => {
			const mockRecord = createTestMaintenance({ status: 'InProgress' });
			const updatedRecord = { ...mockRecord, status: 'Completed' as const };

			vi.mocked(mockMaintenanceRepo.findById).mockResolvedValue(mockRecord);
			vi.mocked(mockMaintenanceRepo.update).mockResolvedValue(updatedRecord);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(null);

			await expect(
				maintenanceService.complete(mockRecord.id, {}, 'user-1')
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('getVehicleHistory', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return vehicle maintenance history', async () => {
			const mockVehicle = createTestVehicle();
			const mockRecords = [
				createTestMaintenance({ vehicleId: mockVehicle.id, status: 'Completed' }),
				createTestMaintenance({ vehicleId: mockVehicle.id, status: 'Completed' }),
			];

			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockMaintenanceRepo.findByVehicleId).mockResolvedValue(mockRecords);

			const result = await maintenanceService.getVehicleHistory(mockVehicle.id, { page: 1, limit: 25 });

			expect(result.items).toHaveLength(2);
			expect(result.meta.total).toBe(2);
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when vehicle not found', async () => {
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(null);

			await expect(
				maintenanceService.getVehicleHistory('nonexistent-id', { page: 1, limit: 25 })
			).rejects.toThrow(NotFoundError);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should filter by type when specified', async () => {
			const mockVehicle = createTestVehicle();
			const mockRecords = [
				createTestMaintenance({ vehicleId: mockVehicle.id, type: 'Scheduled', status: 'Completed' }),
				createTestMaintenance({ vehicleId: mockVehicle.id, type: 'Damage', status: 'Completed' }),
			];

			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockMaintenanceRepo.findByVehicleId).mockResolvedValue(mockRecords);

			const result = await maintenanceService.getVehicleHistory(mockVehicle.id, { page: 1, limit: 25, type: 'Damage' });

			expect(result.items).toHaveLength(1);
			expect(result.items[0].type).toBe('Damage');
		});

		it('[P1] should handle pagination correctly', async () => {
			const mockVehicle = createTestVehicle();
			const mockRecords = Array.from({ length: 30 }, (_, i) =>
				createTestMaintenance({ vehicleId: mockVehicle.id, status: 'Completed' })
			);

			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockMaintenanceRepo.findByVehicleId).mockResolvedValue(mockRecords);

			const result = await maintenanceService.getVehicleHistory(mockVehicle.id, { page: 2, limit: 10 });

			expect(result.items).toHaveLength(10);
			expect(result.meta.page).toBe(2);
			expect(result.meta.totalPages).toBe(3);
		});

		it('[P1] should handle empty history', async () => {
			const mockVehicle = createTestVehicle();

			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockMaintenanceRepo.findByVehicleId).mockResolvedValue([]);

			const result = await maintenanceService.getVehicleHistory(mockVehicle.id, { page: 1, limit: 25 });

			expect(result.items).toHaveLength(0);
			expect(result.meta.total).toBe(0);
		});
	});

	describe('getVehicleMaintenanceSummary', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return vehicle maintenance summary', async () => {
			const mockVehicle = createTestVehicle();
			const mockRecords = [
				createTestMaintenance({ vehicleId: mockVehicle.id, status: 'Completed', cost: 500000 }),
				createTestMaintenance({ vehicleId: mockVehicle.id, status: 'Completed', cost: 300000 }),
			];

			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockMaintenanceRepo.findByVehicleId).mockResolvedValue(mockRecords);

			const result = await maintenanceService.getVehicleMaintenanceSummary(mockVehicle.id);

			expect(result.vehicle.id).toBe(mockVehicle.id);
			expect(result.summary.totalRecords).toBe(2);
			expect(result.summary.totalCost).toBe(800000);
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when vehicle not found', async () => {
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(null);

			await expect(
				maintenanceService.getVehicleMaintenanceSummary('nonexistent-id')
			).rejects.toThrow(NotFoundError);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should only count completed records', async () => {
			const mockVehicle = createTestVehicle();
			const mockRecords = [
				createTestMaintenance({ vehicleId: mockVehicle.id, status: 'Completed', cost: 500000 }),
				createTestMaintenance({ vehicleId: mockVehicle.id, status: 'InProgress', cost: 300000 }),
				createTestMaintenance({ vehicleId: mockVehicle.id, status: 'Scheduled', cost: 200000 }),
			];

			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockMaintenanceRepo.findByVehicleId).mockResolvedValue(mockRecords);

			const result = await maintenanceService.getVehicleMaintenanceSummary(mockVehicle.id);

			expect(result.summary.totalRecords).toBe(1);
			expect(result.summary.totalCost).toBe(500000);
		});

		it('[P1] should handle no completed records', async () => {
			const mockVehicle = createTestVehicle();
			const mockRecords = [
				createTestMaintenance({ vehicleId: mockVehicle.id, status: 'Scheduled' }),
			];

			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockMaintenanceRepo.findByVehicleId).mockResolvedValue(mockRecords);

			const result = await maintenanceService.getVehicleMaintenanceSummary(mockVehicle.id);

			expect(result.summary.totalRecords).toBe(0);
			expect(result.summary.totalCost).toBe(0);
			expect(result.summary.lastMaintenanceDate).toBeNull();
		});

		it('[P1] should limit records to 10 in response', async () => {
			const mockVehicle = createTestVehicle();
			const mockRecords = Array.from({ length: 15 }, () =>
				createTestMaintenance({ vehicleId: mockVehicle.id, status: 'Completed' })
			);

			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);
			vi.mocked(mockMaintenanceRepo.findByVehicleId).mockResolvedValue(mockRecords);

			const result = await maintenanceService.getVehicleMaintenanceSummary(mockVehicle.id);

			expect(result.records).toHaveLength(10);
		});
	});

	describe('getUpcoming', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return scheduled, in-progress, and overdue maintenance', async () => {
			const mockVehicle = createTestVehicle();

			vi.mocked(mockMaintenanceRepo.findUpcoming).mockResolvedValue([
				createTestMaintenance({ vehicleId: mockVehicle.id, status: 'Scheduled', startDate: '2026-03-10' }),
			]);
			vi.mocked(mockMaintenanceRepo.findInProgress).mockResolvedValue([
				createTestMaintenance({ vehicleId: mockVehicle.id, status: 'InProgress', startDate: '2026-03-01' }),
			]);
			vi.mocked(mockMaintenanceRepo.findOverdue).mockResolvedValue([
				createTestMaintenance({ vehicleId: mockVehicle.id, status: 'Scheduled', startDate: '2026-02-20' }),
			]);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);

			const result = await maintenanceService.getUpcoming({ days: 30 });

			expect(result.scheduled).toHaveLength(1);
			expect(result.inProgress).toHaveLength(1);
			expect(result.overdue).toHaveLength(1);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should handle empty upcoming maintenance', async () => {
			vi.mocked(mockMaintenanceRepo.findUpcoming).mockResolvedValue([]);
			vi.mocked(mockMaintenanceRepo.findInProgress).mockResolvedValue([]);
			vi.mocked(mockMaintenanceRepo.findOverdue).mockResolvedValue([]);

			const result = await maintenanceService.getUpcoming({ days: 30 });

			expect(result.scheduled).toHaveLength(0);
			expect(result.inProgress).toHaveLength(0);
			expect(result.overdue).toHaveLength(0);
		});

		it('[P1] should skip records when vehicle not found', async () => {
			vi.mocked(mockMaintenanceRepo.findUpcoming).mockResolvedValue([
				createTestMaintenance(),
			]);
			vi.mocked(mockMaintenanceRepo.findInProgress).mockResolvedValue([]);
			vi.mocked(mockMaintenanceRepo.findOverdue).mockResolvedValue([]);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(null);

			const result = await maintenanceService.getUpcoming({ days: 30 });

			expect(result.scheduled).toHaveLength(0);
		});

		it('[P1] should calculate daysUntil correctly', async () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 5);
			const startDate = futureDate.toISOString().split('T')[0];

			const mockVehicle = createTestVehicle();
			const mockRecord = createTestMaintenance({ vehicleId: mockVehicle.id, startDate });

			vi.mocked(mockMaintenanceRepo.findUpcoming).mockResolvedValue([mockRecord]);
			vi.mocked(mockMaintenanceRepo.findInProgress).mockResolvedValue([]);
			vi.mocked(mockMaintenanceRepo.findOverdue).mockResolvedValue([]);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);

			const result = await maintenanceService.getUpcoming({ days: 30 });

			expect(result.scheduled[0].daysUntil).toBeGreaterThanOrEqual(4);
			expect(result.scheduled[0].daysUntil).toBeLessThanOrEqual(6);
		});

		it('[P1] should mark overdue items correctly', async () => {
			const pastDate = '2026-01-01';
			const mockVehicle = createTestVehicle();
			const mockRecord = createTestMaintenance({ vehicleId: mockVehicle.id, startDate: pastDate });

			vi.mocked(mockMaintenanceRepo.findUpcoming).mockResolvedValue([]);
			vi.mocked(mockMaintenanceRepo.findInProgress).mockResolvedValue([]);
			vi.mocked(mockMaintenanceRepo.findOverdue).mockResolvedValue([mockRecord]);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);

			const result = await maintenanceService.getUpcoming({ days: 30 });

			expect(result.overdue[0].isOverdue).toBe(true);
		});

		it('[P1] should sort results by date', async () => {
			const mockVehicle = createTestVehicle();

			vi.mocked(mockMaintenanceRepo.findUpcoming).mockResolvedValue([
				createTestMaintenance({ vehicleId: mockVehicle.id, startDate: '2026-03-15' }),
				createTestMaintenance({ vehicleId: mockVehicle.id, startDate: '2026-03-05' }),
				createTestMaintenance({ vehicleId: mockVehicle.id, startDate: '2026-03-10' }),
			]);
			vi.mocked(mockMaintenanceRepo.findInProgress).mockResolvedValue([]);
			vi.mocked(mockMaintenanceRepo.findOverdue).mockResolvedValue([]);
			vi.mocked(mockVehiclesRepo.findById).mockResolvedValue(mockVehicle);

			const result = await maintenanceService.getUpcoming({ days: 30 });

			const dates = result.scheduled.map(s => s.scheduledDate);
			expect(dates).toEqual([...dates].sort());
		});
	});
});
