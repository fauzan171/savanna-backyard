import { eq, or, like, and, desc, lte, isNotNull, inArray } from 'drizzle-orm';
import { vehicles, vehicleStatusLogs, bookings, maintenanceRecords, type Vehicle, type NewVehicle, type NewVehicleStatusLog, type Booking, type MaintenanceRecord } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';
import type { ListVehiclesQuery } from './vehicles.dto';

export class VehiclesRepository {
	constructor(private db: Database) {}

	async findById(id: string): Promise<Vehicle | null> {
		const result = await this.db
			.select()
			.from(vehicles)
			.where(eq(vehicles.id, id))
			.limit(1);
		return result[0] ?? null;
	}

	async findByPlateNumber(plateNumber: string): Promise<Vehicle | null> {
		const result = await this.db
			.select()
			.from(vehicles)
			.where(eq(vehicles.plateNumber, plateNumber))
			.limit(1);
		return result[0] ?? null;
	}

	async list(query: ListVehiclesQuery): Promise<{ items: Vehicle[]; total: number }> {
		const offset = (query.page - 1) * query.limit;

		// Build where conditions
		const conditions = [];

		if (query.status) {
			conditions.push(eq(vehicles.status, query.status));
		}

		if (query.type) {
			conditions.push(eq(vehicles.type, query.type));
		}

		if (query.search) {
			const searchPattern = `%${query.search}%`;
			conditions.push(
				or(
					like(vehicles.name, searchPattern),
					like(vehicles.plateNumber, searchPattern),
					like(vehicles.model, searchPattern)
				)
			);
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		// Get items
		const items = await this.db
			.select()
			.from(vehicles)
			.where(whereClause)
			.orderBy(desc(vehicles.createdAt))
			.limit(query.limit)
			.offset(offset);

		// Get total count
		const countResult = await this.db
			.select({ id: vehicles.id })
			.from(vehicles)
			.where(whereClause);

		const total = countResult.length;

		return { items, total };
	}

	async create(data: Omit<NewVehicle, 'id'>): Promise<Vehicle> {
		const id = crypto.randomUUID();
		await this.db.insert(vehicles).values({ id, ...data });
		const vehicle = await this.findById(id);
		if (!vehicle) {
			throw new Error('Failed to create vehicle');
		}
		return vehicle;
	}

	async update(id: string, data: Partial<Omit<NewVehicle, 'id' | 'createdAt'>>): Promise<Vehicle | null> {
		await this.db
			.update(vehicles)
			.set({ ...data, updatedAt: new Date().toISOString() })
			.where(eq(vehicles.id, id));
		return this.findById(id);
	}

	async updateStatus(id: string, status: Vehicle['status']): Promise<Vehicle | null> {
		return this.update(id, { status });
	}

	// Status logs
	async createStatusLog(data: Omit<NewVehicleStatusLog, 'id'>): Promise<void> {
		const id = crypto.randomUUID();
		await this.db.insert(vehicleStatusLogs).values({ id, ...data });
	}

	async getStatusLogs(vehicleId: string, limit = 10): Promise<{
		statusFrom: string;
		statusTo: string;
		notes: string | null;
		recordedBy: string | null;
		createdAt: string;
	}[]> {
		const logs = await this.db
			.select({
				statusFrom: vehicleStatusLogs.statusFrom,
				statusTo: vehicleStatusLogs.statusTo,
				notes: vehicleStatusLogs.notes,
				recordedBy: vehicleStatusLogs.recordedBy,
				createdAt: vehicleStatusLogs.createdAt,
			})
			.from(vehicleStatusLogs)
			.where(eq(vehicleStatusLogs.vehicleId, vehicleId))
			.orderBy(desc(vehicleStatusLogs.createdAt))
			.limit(limit);

		return logs;
	}

	// Get vehicles by status
	async findByStatus(status: Vehicle['status']): Promise<Vehicle[]> {
		return this.db
			.select()
			.from(vehicles)
			.where(eq(vehicles.status, status));
	}

	// Get available vehicles (status = Available and not on maintenance)
	async getAvailableVehicles(type?: string): Promise<Vehicle[]> {
		const conditions = [eq(vehicles.status, 'Available')];

		if (type) {
			conditions.push(eq(vehicles.type, type as Vehicle['type']));
		}

		return this.db
			.select()
			.from(vehicles)
			.where(and(...conditions));
	}

	// Check if vehicle exists
	async checkExists(id: string): Promise<boolean> {
		const result = await this.findById(id);
		return result !== null;
	}

	/** Get vehicles that are in Cleaning status and past their cleaningCompletedAt time */
	async getCleanableVehicles(): Promise<Vehicle[]> {
		const now = new Date().toISOString();
		return this.db
			.select()
			.from(vehicles)
			.where(
				and(
					eq(vehicles.status, 'Cleaning'),
					isNotNull(vehicles.cleaningCompletedAt),
					lte(vehicles.cleaningCompletedAt, now),
				)
			);
	}

	/** Mark vehicle as cleaned (back to Available) */
	async markCleaned(id: string): Promise<void> {
		await this.db
			.update(vehicles)
			.set({
				status: 'Available',
				conditionStatus: 'Excellent',
				cleaningCompletedAt: null,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(vehicles.id, id));
	}

	/**
	 * Count active bookings for a vehicle (statuses that are not terminal).
	 * Used to block deletion of vehicles that still have live rentals.
	 */
	async countActiveBookings(vehicleId: string): Promise<number> {
		const activeStatuses: Booking['status'][] = ['Pending', 'pending_payment', 'Confirmed', 'Active'];
		const rows = await this.db
			.select({ id: bookings.id })
			.from(bookings)
			.where(and(eq(bookings.vehicleId, vehicleId), inArray(bookings.status, activeStatuses)));
		return rows.length;
	}

	/**
	 * Count active maintenance records for a vehicle.
	 */
	async countActiveMaintenance(vehicleId: string): Promise<number> {
		const activeStatuses: MaintenanceRecord['status'][] = ['Scheduled', 'InProgress'];
		const rows = await this.db
			.select({ id: maintenanceRecords.id })
			.from(maintenanceRecords)
			.where(and(eq(maintenanceRecords.vehicleId, vehicleId), inArray(maintenanceRecords.status, activeStatuses)));
		return rows.length;
	}

	/**
	 * Delete a vehicle. Status logs are cleaned up first to satisfy the
	 * foreign-key reference. Callers must verify no active bookings/maintenance
	 * exist before invoking this.
	 */
	async delete(id: string): Promise<void> {
		// Remove dependent status logs first
		await this.db.delete(vehicleStatusLogs).where(eq(vehicleStatusLogs.vehicleId, id));
		await this.db.delete(vehicles).where(eq(vehicles.id, id));
	}
}
