import { eq, asc, sql } from 'drizzle-orm';
import { pricingTiers, type PricingTier, type NewPricingTier } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';

export class PricingRepository {
	constructor(private db: Database) {}

	async list(): Promise<PricingTier[]> {
		return this.db.select().from(pricingTiers).orderBy(asc(pricingTiers.sortOrder));
	}

	async getById(id: string): Promise<PricingTier | null> {
		const result = await this.db.select().from(pricingTiers).where(eq(pricingTiers.id, id)).limit(1);
		return result[0] ?? null;
	}

	async create(data: Omit<NewPricingTier, 'id'>): Promise<PricingTier> {
		const id = crypto.randomUUID();
		await this.db.insert(pricingTiers).values({ id, ...data });
		const result = await this.db.select().from(pricingTiers).where(eq(pricingTiers.id, id)).limit(1);
		return result[0]!;
	}

	async update(id: string, data: Partial<NewPricingTier>): Promise<PricingTier> {
		await this.db.update(pricingTiers).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(pricingTiers.id, id));
		const result = await this.db.select().from(pricingTiers).where(eq(pricingTiers.id, id)).limit(1);
		return result[0]!;
	}

	async delete(id: string): Promise<void> {
		await this.db.delete(pricingTiers).where(eq(pricingTiers.id, id));
	}

	/** BUG#7: atomic flip — no read-then-write race. */
	async toggleActive(id: string): Promise<PricingTier | null> {
		await this.db
			.update(pricingTiers)
			.set({ isActive: sql`NOT ${pricingTiers.isActive}`, updatedAt: new Date().toISOString() })
			.where(eq(pricingTiers.id, id));
		const result = await this.db.select().from(pricingTiers).where(eq(pricingTiers.id, id)).limit(1);
		return result[0] ?? null;
	}
}
