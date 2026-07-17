import { eq, desc } from 'drizzle-orm';
import { vehicleConditions, type NewVehicleCondition } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';

export class VehicleConditionsRepository {
	constructor(private db: Database) {}

	async create(
		data: Omit<NewVehicleCondition, 'id' | 'createdAt'>,
	): Promise<void> {
		const id = crypto.randomUUID();
		await this.db.insert(vehicleConditions).values({
			id,
			...data,
			createdAt: new Date().toISOString(),
		});
	}

	async listByVehicle(vehicleId: string, limit = 20): Promise<typeof vehicleConditions.$inferSelect[]> {
		return this.db
			.select()
			.from(vehicleConditions)
			.where(eq(vehicleConditions.vehicleId, vehicleId))
			.orderBy(desc(vehicleConditions.checkedAt))
			.limit(limit);
	}
}
