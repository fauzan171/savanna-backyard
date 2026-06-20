import { eq, and } from 'drizzle-orm';
import { vehicleChecklists, type VehicleChecklist, type NewVehicleChecklist } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';

export class ChecklistsRepository {
	constructor(private db: Database) {}

	async findById(id: string): Promise<VehicleChecklist | null> {
		const result = await this.db.select().from(vehicleChecklists).where(eq(vehicleChecklists.id, id)).limit(1);
		return result[0] ?? null;
	}

	async findByBookingId(bookingId: string): Promise<{ pickup: VehicleChecklist | null; return: VehicleChecklist | null }> {
		const results = await this.db
			.select()
			.from(vehicleChecklists)
			.where(eq(vehicleChecklists.bookingId, bookingId));

		const pickup = results.find((r) => r.type === 'pickup') ?? null;
		const returnChecklist = results.find((r) => r.type === 'return') ?? null;

		return { pickup, return: returnChecklist };
	}

	async findByBookingAndType(bookingId: string, type: 'pickup' | 'return'): Promise<VehicleChecklist | null> {
		const result = await this.db
			.select()
			.from(vehicleChecklists)
			.where(and(
				eq(vehicleChecklists.bookingId, bookingId),
				eq(vehicleChecklists.type, type)
			))
			.limit(1);
		return result[0] ?? null;
	}

	async create(data: Omit<NewVehicleChecklist, 'id'>): Promise<VehicleChecklist> {
		const id = crypto.randomUUID();
		await this.db.insert(vehicleChecklists).values({ id, ...data });
		const result = await this.db.select().from(vehicleChecklists).where(eq(vehicleChecklists.id, id)).limit(1);
		return result[0]!;
	}

	async update(id: string, data: Partial<NewVehicleChecklist>): Promise<VehicleChecklist> {
		await this.db.update(vehicleChecklists).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(vehicleChecklists.id, id));
		const result = await this.db.select().from(vehicleChecklists).where(eq(vehicleChecklists.id, id)).limit(1);
		return result[0]!;
	}
}
