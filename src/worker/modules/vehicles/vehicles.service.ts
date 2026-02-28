import { VehiclesRepository } from './vehicles.repository';
import { ConflictError, NotFoundError, ValidationError } from '@/worker/core/types/errors';
import type {
	VehicleResponse,
	VehicleWithDetails,
	AvailabilityResult,
	CalendarResult,
} from './vehicles.types';
import type {
	CreateVehicleRequest,
	UpdateVehicleRequest,
	UpdateStatusRequest,
	ListVehiclesQuery,
	AvailabilityQuery,
} from './vehicles.dto';
import type { Vehicle } from '@/worker/core/database/schema';

export class VehiclesService {
	constructor(private vehicleRepo: VehiclesRepository) {}

	// Transform vehicle to response format
	private toResponse(vehicle: Vehicle): VehicleResponse {
		return {
			id: vehicle.id,
			name: vehicle.name,
			plateNumber: vehicle.plateNumber,
			type: vehicle.type,
			brand: vehicle.brand,
			model: vehicle.model,
			year: vehicle.year,
			dailyRateIdr: vehicle.dailyRateIdr,
			dailyRateUsd: vehicle.dailyRateUsd,
			status: vehicle.status,
			totalKm: vehicle.totalKm,
			photoUrl: vehicle.photoUrl,
			createdAt: vehicle.createdAt,
		};
	}

	async list(query: ListVehiclesQuery): Promise<{
		items: VehicleResponse[];
		meta: { page: number; limit: number; total: number; totalPages: number };
	}> {
		const { items, total } = await this.vehicleRepo.list(query);
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

	async getById(id: string): Promise<VehicleWithDetails | null> {
		const vehicle = await this.vehicleRepo.findById(id);
		if (!vehicle) {
			return null;
		}

		// Get status logs
		const statusLogs = await this.vehicleRepo.getStatusLogs(id);

		// TODO: Fetch booking info when booking module is implemented
		const currentBooking = null;
		const upcomingBookings: VehicleWithDetails['upcomingBookings'] = [];
		const maintenanceHistory: VehicleWithDetails['maintenanceHistory'] = [];

		return {
			...this.toResponse(vehicle),
			currentBooking,
			upcomingBookings,
			maintenanceHistory,
			statusLogs,
		};
	}

	async create(data: CreateVehicleRequest): Promise<VehicleResponse> {
		// Check if plate number already exists
		const existingByPlate = await this.vehicleRepo.findByPlateNumber(data.plateNumber);
		if (existingByPlate) {
			throw new ConflictError('Vehicle with this plate number already exists');
		}

		const vehicle = await this.vehicleRepo.create({
			name: data.name,
			plateNumber: data.plateNumber,
			type: data.type,
			brand: data.brand ?? null,
			model: data.model ?? null,
			year: data.year ?? null,
			dailyRateIdr: data.dailyRateIdr,
			dailyRateUsd: data.dailyRateUsd ?? null,
			photoUrl: data.photoUrl ?? null,
			status: 'Available',
			totalKm: 0,
		});

		return this.toResponse(vehicle);
	}

	async update(id: string, data: UpdateVehicleRequest): Promise<VehicleResponse> {
		const existing = await this.vehicleRepo.findById(id);
		if (!existing) {
			throw new NotFoundError('Vehicle');
		}

		// Check plate number uniqueness if changing
		if (data.plateNumber && data.plateNumber !== existing.plateNumber) {
			const existingByPlate = await this.vehicleRepo.findByPlateNumber(data.plateNumber);
			if (existingByPlate) {
				throw new ConflictError('Vehicle with this plate number already exists');
			}
		}

		const vehicle = await this.vehicleRepo.update(id, {
			name: data.name,
			plateNumber: data.plateNumber,
			type: data.type,
			brand: data.brand,
			model: data.model,
			year: data.year,
			dailyRateIdr: data.dailyRateIdr,
			dailyRateUsd: data.dailyRateUsd,
			totalKm: data.totalKm,
			photoUrl: data.photoUrl,
		});

		if (!vehicle) {
			throw new NotFoundError('Vehicle');
		}

		return this.toResponse(vehicle);
	}

	async updateStatus(id: string, data: UpdateStatusRequest, userId: string): Promise<{
		vehicle: VehicleResponse;
		statusLog: {
			statusFrom: string;
			statusTo: string;
			notes: string | null;
			recordedBy: string;
			createdAt: string;
		};
	}> {
		const existing = await this.vehicleRepo.findById(id);
		if (!existing) {
			throw new NotFoundError('Vehicle');
		}

		// Update vehicle status
		const vehicle = await this.vehicleRepo.updateStatus(id, data.status);
		if (!vehicle) {
			throw new NotFoundError('Vehicle');
		}

		// Create status log
		await this.vehicleRepo.createStatusLog({
			vehicleId: id,
			statusFrom: existing.status,
			statusTo: data.status,
			notes: data.notes ?? null,
			recordedBy: userId,
		});

		return {
			vehicle: this.toResponse(vehicle),
			statusLog: {
				statusFrom: existing.status,
				statusTo: data.status,
				notes: data.notes ?? null,
				recordedBy: userId,
				createdAt: new Date().toISOString(),
			},
		};
	}

	async checkAvailability(query: AvailabilityQuery): Promise<AvailabilityResult> {
		// Validate date range
		if (query.startDate > query.endDate) {
			throw new ValidationError('Start date must be before or equal to end date');
		}

		// Get vehicles to check
		let vehiclesToCheck: Vehicle[];
		if (query.vehicleId) {
			const vehicle = await this.vehicleRepo.findById(query.vehicleId);
			if (!vehicle) {
				throw new NotFoundError('Vehicle');
			}
			vehiclesToCheck = [vehicle];
		} else {
			vehiclesToCheck = await this.vehicleRepo.getAvailableVehicles(query.type);
		}

		// TODO: Implement actual availability checking with bookings when booking module is ready
		// For now, return all vehicles as available
		const availableVehicles: AvailabilityResult['availableVehicles'] = vehiclesToCheck
			.filter(v => v.status === 'Available')
			.map(v => ({
				id: v.id,
				name: v.name,
				type: v.type,
				dailyRateIdr: v.dailyRateIdr,
				plateNumber: v.plateNumber,
			}));

		const maintenanceVehicles: AvailabilityResult['maintenanceVehicles'] = vehiclesToCheck
			.filter(v => v.status === 'Maintenance')
			.map(v => ({
				id: v.id,
				name: v.name,
				reason: 'Under maintenance',
				maintenanceEndDate: null,
			}));

		return {
			requestedPeriod: {
				startDate: query.startDate,
				endDate: query.endDate,
			},
			availableVehicles,
			unavailableVehicles: [],
			maintenanceVehicles,
		};
	}

	async getCalendar(vehicleId: string, month: string): Promise<CalendarResult> {
		const vehicle = await this.vehicleRepo.findById(vehicleId);
		if (!vehicle) {
			throw new NotFoundError('Vehicle');
		}

		// Parse month (YYYY-MM)
		const [year, monthNum] = month.split('-').map(Number);
		const startDate = new Date(year, monthNum - 1, 1);
		const endDate = new Date(year, monthNum, 0); // Last day of month

		// Generate calendar days
		const calendar: CalendarResult['calendar'] = [];
		const currentDate = new Date(startDate);

		while (currentDate <= endDate) {
			const dateStr = currentDate.toISOString().split('T')[0];
			calendar.push({
				date: dateStr,
				status: 'available', // TODO: Check actual booking status
			});
			currentDate.setDate(currentDate.getDate() + 1);
		}

		return {
			vehicleId,
			month,
			calendar,
		};
	}

	// Internal method for booking module to check availability
	async checkAvailabilityForDates(
		vehicleId: string,
		_startDate: string,
		_endDate: string,
		_excludeBookingId?: string
	): Promise<boolean> {
		const vehicle = await this.vehicleRepo.findById(vehicleId);
		if (!vehicle) {
			return false;
		}

		// Check if vehicle is in maintenance or inactive
		if (vehicle.status === 'Maintenance' || vehicle.status === 'Inactive') {
			return false;
		}

		// TODO: Check booking conflicts when booking module is implemented
		return true;
	}
}
