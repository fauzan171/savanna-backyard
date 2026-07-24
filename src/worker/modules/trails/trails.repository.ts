import { eq, asc, sql } from 'drizzle-orm';
import { trails, type Trail, type NewTrail } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';

export class TrailsRepository {
	constructor(private db: Database) {}

	async list(): Promise<Trail[]> {
		return this.db.select().from(trails).orderBy(asc(trails.sortOrder));
	}

	async getById(id: string): Promise<Trail | null> {
		const result = await this.db.select().from(trails).where(eq(trails.id, id)).limit(1);
		return result[0] ?? null;
	}

	async findByName(name: string): Promise<Trail | null> {
		const result = await this.db.select().from(trails).where(eq(trails.name, name)).limit(1);
		return result[0] ?? null;
	}

	async create(data: NewTrail): Promise<Trail> {
		await this.db.insert(trails).values(data);
		const result = await this.db.select().from(trails).where(eq(trails.id, data.id)).limit(1);
		return result[0]!;
	}

	async update(id: string, data: Partial<NewTrail>): Promise<Trail> {
		await this.db.update(trails).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(trails.id, id));
		const result = await this.db.select().from(trails).where(eq(trails.id, id)).limit(1);
		return result[0]!;
	}

	async delete(id: string): Promise<void> {
		await this.db.delete(trails).where(eq(trails.id, id));
	}

	/** BUG#7: atomic flip — NOT(isActive) at the SQL level, no read-then-write race. */
	async toggleActive(id: string): Promise<Trail | null> {
		await this.db
			.update(trails)
			.set({ isActive: sql`NOT ${trails.isActive}`, updatedAt: new Date().toISOString() })
			.where(eq(trails.id, id));
		const result = await this.db.select().from(trails).where(eq(trails.id, id)).limit(1);
		return result[0] ?? null;
	}
}
