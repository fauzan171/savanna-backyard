import { eq, asc, and, inArray } from 'drizzle-orm';
import type { Database } from '@/worker/core/database';
import { equipment, type Equipment, type NewEquipment } from '@/worker/core/database/schema';

export class EquipmentRepository {
	constructor(private db: Database) {}

	async list(activeOnly = false): Promise<Equipment[]> {
		const query = activeOnly
			? this.db.select().from(equipment).where(eq(equipment.isActive, true)).orderBy(asc(equipment.sortOrder), asc(equipment.name))
			: this.db.select().from(equipment).orderBy(asc(equipment.sortOrder), asc(equipment.name));
		return query;
	}

	async getById(id: string): Promise<Equipment | null> {
		const [row] = await this.db.select().from(equipment).where(eq(equipment.id, id)).limit(1);
		return row ?? null;
	}

	async getActiveByIds(ids: string[]): Promise<Equipment[]> {
		if (ids.length === 0) return [];
		const rows = await this.db.select().from(equipment).where(and(inArray(equipment.id, ids), eq(equipment.isActive, true)));
		return rows;
	}

	async create(data: Omit<NewEquipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Equipment> {
		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		await this.db.insert(equipment).values({ id, ...data, createdAt: now, updatedAt: now });
		const [row] = await this.db.select().from(equipment).where(eq(equipment.id, id)).limit(1);
		return row!;
	}

	async update(id: string, data: Partial<NewEquipment>): Promise<Equipment> {
		await this.db.update(equipment).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(equipment.id, id));
		const [row] = await this.db.select().from(equipment).where(eq(equipment.id, id)).limit(1);
		return row!;
	}

	async delete(id: string): Promise<void> {
		await this.db.delete(equipment).where(eq(equipment.id, id));
	}
}
