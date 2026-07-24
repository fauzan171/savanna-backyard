import { eq, asc, sql } from 'drizzle-orm';
import { packages, type Package, type NewPackage } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';

export class PackagesRepository {
	constructor(private db: Database) {}

	async list(): Promise<Package[]> {
		return this.db.select().from(packages).orderBy(asc(packages.sortOrder));
	}

	async getById(id: string): Promise<Package | null> {
		const result = await this.db.select().from(packages).where(eq(packages.id, id)).limit(1);
		return result[0] ?? null;
	}

	async create(data: Omit<NewPackage, 'id'>): Promise<Package> {
		const id = crypto.randomUUID();
		await this.db.insert(packages).values({ id, ...data });
		const result = await this.db.select().from(packages).where(eq(packages.id, id)).limit(1);
		return result[0]!;
	}

	async update(id: string, data: Partial<NewPackage>): Promise<Package> {
		await this.db.update(packages).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(packages.id, id));
		const result = await this.db.select().from(packages).where(eq(packages.id, id)).limit(1);
		return result[0]!;
	}

	async delete(id: string): Promise<void> {
		await this.db.delete(packages).where(eq(packages.id, id));
	}

	/** BUG#7: atomic flip — no read-then-write race. */
	async toggleActive(id: string): Promise<Package | null> {
		await this.db
			.update(packages)
			.set({ isActive: sql`NOT ${packages.isActive}`, updatedAt: new Date().toISOString() })
			.where(eq(packages.id, id));
		const result = await this.db.select().from(packages).where(eq(packages.id, id)).limit(1);
		return result[0] ?? null;
	}
}
