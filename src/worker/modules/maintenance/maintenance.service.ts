import { MaintenanceRepository } from './maintenance.repository';
import { VehiclesRepository } from '../vehicles/vehicles.repository';
import { BookingsRepository } from '../bookings/bookings.repository';
import { UserRepository } from '../auth/auth.repository';
import { NotFoundError, ValidationError, ConflictError } from '@/worker/core/types/errors';
import type {
	MaintenanceResponse,
	MaintenanceWithDetails,
	MaintenanceHistoryItem,
	UpcomingMaintenanceItem,
	CreateMaintenanceResult,
	CompleteMaintenanceResult,
	MaintenancePhoto,
	VehicleMaintenanceSummary,
} from './maintenance.types';
import type {
	CreateMaintenanceRequest,
	UpdateMaintenanceRequest,
	CompleteMaintenanceRequest,
	ListMaintenanceQuery,
	VehicleHistoryQuery,
	UpcomingQuery,
} from './maintenance.dto';
import type { maintenanceRecords } from '@/worker/core/database/schema';

export class MaintenanceService {
	constructor(
		private maintenanceRepo: MaintenanceRepository,
		private vehiclesRepo: VehiclesRepository,
		private bookingsRepo: BookingsRepository | null = null,
		private usersRepo: UserRepository | null = null
	) {}

	// Transform maintenance record to response format
	private toResponse(record: typeof maintenanceRecords.$inferSelect): MaintenanceResponse {
		// Parse photos from JSON if exists
		let photos: MaintenancePhoto[] | null = null;
		if (record.photos) {
			try {
				photos = JSON.parse(record.photos as string);
			} catch {
				photos = null;
			}
		}

		return {
			id: record.id,
			vehicleId: record.vehicleId,
			type: record.type,
			description: record.description,
			cost: record.cost,
			startDate: record.startDate,
			endDate: record.endDate,
			status: record.status,
			bookingId: record.bookingId,
			photos,
			createdBy: record.createdBy,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		};
	}

	async list(query: ListMaintenanceQuery): Promise<{
		items: MaintenanceResponse[];
		meta: { page: number; limit: number; total: number; totalPages: number };
	}> {
		const { items, total } = await this.maintenanceRepo.list(query);
		const totalPages = Math.ceil(total / query.limit);

		return {
			items: items.map(this.toResponse),
			meta: {
				page: query.page,
				limit: query.limit,
				total,
				totalPages,
			},
		};
	}

	async getById(id: string): Promise<MaintenanceWithDetails | null> {
		const record = await this.maintenanceRepo.findById(id);
		if (!record) {
			return null;
		}

		const vehicle = await this.vehiclesRepo.findById(record.vehicleId);
		const response = this.toResponse(record);

		// Get booking details if linked
		let booking = null;
		if (record.bookingId && this.bookingsRepo) {
			const bookingData = await this.bookingsRepo.findById(record.bookingId);
			if (bookingData) {
				booking = {
					id: bookingData.id,
					bookingNumber: bookingData.bookingNumber,
					customerName: '', // Would need to join with customers
					startDate: bookingData.startDate,
					endDate: bookingData.endDate,
				};
			}
		}

		// Get user details
		let createdByUser = null;
		if (record.createdBy && this.usersRepo) {
			const user = await this.usersRepo.findById(record.createdBy);
			if (user) {
				createdByUser = {
					id: user.id,
					name: user.name,
				};
			}
		}

		return {
			...response,
			vehicle: vehicle ? {
				id: vehicle.id,
				name: vehicle.name,
				plateNumber: vehicle.plateNumber,
				status: vehicle.status,
			} : null,
			booking,
			createdByUser,
		};
	}

	async create(data: CreateMaintenanceRequest, userId: string): Promise<CreateMaintenanceResult> {
		// Verify vehicle exists
		const vehicle = await this.vehiclesRepo.findById(data.vehicleId);
		if (!vehicle) {
			throw new NotFoundError('Vehicle');
		}

		// Check if vehicle already has active maintenance
		const activeMaintenance = await this.maintenanceRepo.findActiveByVehicleId(data.vehicleId);
		if (activeMaintenance) {
			throw new ConflictError('Vehicle already has active maintenance');
		}

		// Serialize photos to JSON
		const photosJson = data.photos ? JSON.stringify(data.photos) : null;

		// Create maintenance record
		const record = await this.maintenanceRepo.create({
			vehicleId: data.vehicleId,
			type: data.type,
			description: data.description,
			cost: data.cost ?? 0,
			startDate: data.startDate,
			endDate: data.endDate ?? null,
			status: 'Scheduled',
			bookingId: data.bookingId ?? null,
			photos: photosJson,
			createdBy: userId,
		});

		// Update vehicle status to 'Maintenance'
		const previousStatus = vehicle.status;
		await this.vehiclesRepo.updateStatus(data.vehicleId, 'Maintenance');

		// Create status log
		await this.vehiclesRepo.createStatusLog({
			vehicleId: data.vehicleId,
			statusFrom: previousStatus,
			statusTo: 'Maintenance',
			notes: `Maintenance created: ${data.type} - ${data.description}`,
			recordedBy: userId,
		});

		return {
			maintenance: this.toResponse(record),
			vehicleStatusUpdate: {
				statusFrom: previousStatus,
				statusTo: 'Maintenance',
			},
		};
	}

	async update(id: string, data: UpdateMaintenanceRequest): Promise<MaintenanceResponse> {
		const existing = await this.maintenanceRepo.findById(id);
		if (!existing) {
			throw new NotFoundError('Maintenance record');
		}

		// Cannot update if maintenance is already completed
		if (existing.status === 'Completed') {
			throw new ValidationError('Cannot update completed maintenance records');
		}

		// Serialize photos to JSON if provided
		const updateData: Record<string, unknown> = { ...data };
		if (data.photos !== undefined) {
			updateData.photos = data.photos ? JSON.stringify(data.photos) : null;
		}

		const record = await this.maintenanceRepo.update(id, updateData);

		if (!record) {
			throw new NotFoundError('Maintenance record');
		}

		return this.toResponse(record);
	}

	async start(id: string, userId: string): Promise<MaintenanceResponse> {
		const record = await this.maintenanceRepo.findById(id);
		if (!record) {
			throw new NotFoundError('Maintenance record');
		}

		if (record.status !== 'Scheduled') {
			throw new ValidationError('Maintenance can only be started from Scheduled status');
		}

		const updated = await this.maintenanceRepo.update(id, {
			status: 'InProgress',
		});

		if (!updated) {
			throw new NotFoundError('Maintenance record');
		}

		// Update vehicle status log
		const vehicle = await this.vehiclesRepo.findById(record.vehicleId);
		if (vehicle) {
			await this.vehiclesRepo.createStatusLog({
				vehicleId: record.vehicleId,
				statusFrom: vehicle.status,
				statusTo: 'Maintenance',
				notes: `Maintenance started: ${record.type}`,
				recordedBy: userId,
			});
		}

		return this.toResponse(updated);
	}

	async complete(id: string, data: CompleteMaintenanceRequest, userId: string): Promise<CompleteMaintenanceResult> {
		const record = await this.maintenanceRepo.findById(id);
		if (!record) {
			throw new NotFoundError('Maintenance record');
		}

		if (record.status === 'Completed') {
			throw new ValidationError('Maintenance is already completed');
		}

		const today = new Date().toISOString().split('T')[0];

		const updateData: Record<string, unknown> = {
			status: 'Completed',
			endDate: record.endDate ?? today,
		};

		if (data.actualCost !== undefined) {
			updateData.cost = data.actualCost;
		}

		const updated = await this.maintenanceRepo.update(id, updateData);

		if (!updated) {
			throw new NotFoundError('Maintenance record');
		}

		// Get vehicle for status update
		const vehicle = await this.vehiclesRepo.findById(record.vehicleId);
		if (!vehicle) {
			throw new NotFoundError('Vehicle');
		}

		// Update vehicle status to 'Available'
		await this.vehiclesRepo.updateStatus(record.vehicleId, 'Available');

		// Create status log
		await this.vehiclesRepo.createStatusLog({
			vehicleId: record.vehicleId,
			statusFrom: 'Maintenance',
			statusTo: 'Available',
			notes: `Maintenance completed: ${record.type} - ${record.description}`,
			recordedBy: userId,
		});

		return {
			maintenance: this.toResponse(updated),
			vehicleStatusUpdate: {
				statusFrom: 'Maintenance',
				statusTo: 'Available',
			},
		};
	}

	async getVehicleHistory(vehicleId: string, query: VehicleHistoryQuery): Promise<{
		items: MaintenanceHistoryItem[];
		meta: { page: number; limit: number; total: number; totalPages: number };
	}> {
		// Verify vehicle exists
		const vehicle = await this.vehiclesRepo.findById(vehicleId);
		if (!vehicle) {
			throw new NotFoundError('Vehicle');
		}

		// Get all records for the vehicle
		const allRecords = await this.maintenanceRepo.findByVehicleId(vehicleId, 1000);

		// Filter by type if specified
		let filteredRecords = allRecords;
		if (query.type) {
			filteredRecords = allRecords.filter(r => r.type === query.type);
		}

		// Paginate
		const total = filteredRecords.length;
		const totalPages = Math.ceil(total / query.limit);
		const start = (query.page - 1) * query.limit;
		const paginatedRecords = filteredRecords.slice(start, start + query.limit);

		const items: MaintenanceHistoryItem[] = paginatedRecords.map(record => {
			let photos: MaintenancePhoto[] | null = null;
			if (record.photos) {
				try {
					photos = JSON.parse(record.photos as string);
				} catch {
					photos = null;
				}
			}

			return {
				id: record.id,
				type: record.type,
				description: record.description,
				cost: record.cost,
				startDate: record.startDate,
				endDate: record.endDate,
				status: record.status,
				photos,
				completedAt: record.status === 'Completed' ? record.endDate : null,
			};
		});

		return {
			items,
			meta: {
				page: query.page,
				limit: query.limit,
				total,
				totalPages,
			},
		};
	}

	async getVehicleMaintenanceSummary(vehicleId: string): Promise<VehicleMaintenanceSummary> {
		// Verify vehicle exists
		const vehicle = await this.vehiclesRepo.findById(vehicleId);
		if (!vehicle) {
			throw new NotFoundError('Vehicle');
		}

		// Get all completed records for the vehicle
		const allRecords = await this.maintenanceRepo.findByVehicleId(vehicleId, 1000);
		const completedRecords = allRecords.filter(r => r.status === 'Completed');

		const totalCost = completedRecords.reduce((sum, r) => sum + (r.cost ?? 0), 0);
		const lastMaintenance = completedRecords.length > 0 ? completedRecords[0].endDate : null;

		const records: MaintenanceHistoryItem[] = completedRecords.slice(0, 10).map(record => {
			let photos: MaintenancePhoto[] | null = null;
			if (record.photos) {
				try {
					photos = JSON.parse(record.photos as string);
				} catch {
					photos = null;
				}
			}

			return {
				id: record.id,
				type: record.type,
				description: record.description,
				cost: record.cost,
				startDate: record.startDate,
				endDate: record.endDate,
				status: record.status,
				photos,
				completedAt: record.endDate,
			};
		});

		return {
			vehicle: {
				id: vehicle.id,
				name: vehicle.name,
				plateNumber: vehicle.plateNumber,
			},
			summary: {
				totalRecords: completedRecords.length,
				totalCost,
				lastMaintenanceDate: lastMaintenance,
			},
			records,
		};
	}

	async getUpcoming(query: UpcomingQuery): Promise<{
		scheduled: UpcomingMaintenanceItem[];
		inProgress: UpcomingMaintenanceItem[];
		overdue: UpcomingMaintenanceItem[];
	}> {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Get scheduled maintenance
		const scheduledRecords = await this.maintenanceRepo.findUpcoming(query.days);
		const scheduled: UpcomingMaintenanceItem[] = [];

		for (const record of scheduledRecords) {
			const vehicle = await this.vehiclesRepo.findById(record.vehicleId);
			if (!vehicle) continue;

			const startDate = new Date(record.startDate);
			const daysUntil = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

			scheduled.push({
				id: record.id,
				vehicleId: record.vehicleId,
				vehicleName: vehicle.name,
				vehiclePlateNumber: vehicle.plateNumber,
				type: record.type,
				description: record.description,
				scheduledDate: record.startDate,
				expectedEnd: record.endDate,
				daysUntil,
				isOverdue: false,
			});
		}

		// Get in-progress maintenance
		const inProgressRecords = await this.maintenanceRepo.findInProgress();
		const inProgress: UpcomingMaintenanceItem[] = [];

		for (const record of inProgressRecords) {
			const vehicle = await this.vehiclesRepo.findById(record.vehicleId);
			if (!vehicle) continue;

			inProgress.push({
				id: record.id,
				vehicleId: record.vehicleId,
				vehicleName: vehicle.name,
				vehiclePlateNumber: vehicle.plateNumber,
				type: record.type,
				description: record.description,
				scheduledDate: record.startDate,
				expectedEnd: record.endDate,
				daysUntil: 0,
				isOverdue: false,
			});
		}

		// Get overdue maintenance
		const overdueRecords = await this.maintenanceRepo.findOverdue();
		const overdue: UpcomingMaintenanceItem[] = [];

		for (const record of overdueRecords) {
			const vehicle = await this.vehiclesRepo.findById(record.vehicleId);
			if (!vehicle) continue;

			const startDate = new Date(record.startDate);
			const daysUntil = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

			overdue.push({
				id: record.id,
				vehicleId: record.vehicleId,
				vehicleName: vehicle.name,
				vehiclePlateNumber: vehicle.plateNumber,
				type: record.type,
				description: record.description,
				scheduledDate: record.startDate,
				expectedEnd: record.endDate,
				daysUntil,
				isOverdue: true,
			});
		}

		// Sort by date
		scheduled.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
		inProgress.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
		overdue.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

		return { scheduled, inProgress, overdue };
	}
}
