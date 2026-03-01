import { eq, and } from 'drizzle-orm';
import { leads, vehicles, type Lead, type Vehicle, type NewLead } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';

export class PublicApiRepository {
	constructor(private db: Database) {}

	// Lead operations
	async createLead(data: Omit<NewLead, 'id'>): Promise<Lead> {
		const id = crypto.randomUUID();
		await this.db.insert(leads).values({ id, ...data });
		const lead = await this.db
			.select()
			.from(leads)
			.where(eq(leads.id, id))
			.limit(1);
		return lead[0]!;
	}

	// Vehicle operations - only return active vehicles
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

	// Get active vehicles (exclude InActive)
	async getActiveVehicles(): Promise<Vehicle[]> {
		return this.db
			.select()
			.from(vehicles)
			.where(eq(vehicles.status, 'Available'));
	}

	// Get vehicle by ID
	async getVehicleById(id: string): Promise<Vehicle | null> {
		const result = await this.db
			.select()
			.from(vehicles)
			.where(eq(vehicles.id, id))
			.limit(1);
		return result[0] ?? null;
	}

	// Get vehicle types with counts
	async getVehicleTypes(): Promise<Array<{
		type: string;
		displayName: string;
		count: number;
		minDailyRate: number;
		maxDailyRate: number;
	}>> {
		const vehicleList = await this.getActiveVehicles();

		const typeMap = new Map<string, { count: number; rates: number[] }>();

		for (const vehicle of vehicleList) {
			const existing = typeMap.get(vehicle.type) || { count: 0, rates: [] };
			existing.count++;
			existing.rates.push(vehicle.dailyRateIdr);
			typeMap.set(vehicle.type, existing);
		}

		return Array.from(typeMap.entries()).map(([type, data]) => ({
			type,
			displayName: type,
			count: data.count,
			minDailyRate: Math.min(...data.rates),
			maxDailyRate: Math.max(...data.rates),
		}));
	}
}
