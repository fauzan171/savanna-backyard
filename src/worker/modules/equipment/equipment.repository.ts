import { eq, asc, and, inArray, sql, gte } from 'drizzle-orm';
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

	/**
	 * Atomically decrement stock for an equipment item. Only succeeds if enough
	 * stock remains (WHERE stock >= qty), preventing oversell without a
	 * transaction. Returns true if decremented, false if insufficient stock.
	 * B3 fix.
	 */
	async decrementStock(id: string, qty: number): Promise<boolean> {
		const result = await this.db
			.update(equipment)
			.set({ stock: sql`${equipment.stock} - ${qty}`, updatedAt: new Date().toISOString() })
			.where(and(eq(equipment.id, id), gte(equipment.stock, qty)));
		return (result as unknown as { rowsAffected?: number }).rowsAffected !== 0;
	}

	/**
	 * Restore stock (e.g. when a booking is cancelled). B3 fix.
	 */
	async restoreStock(id: string, qty: number): Promise<void> {
		await this.db
			.update(equipment)
			.set({ stock: sql`${equipment.stock} + ${qty}`, updatedAt: new Date().toISOString() })
			.where(eq(equipment.id, id));
	}
}
