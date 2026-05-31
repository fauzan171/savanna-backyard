import { eq, desc } from 'drizzle-orm';
import { reviews, type Review, type NewReview } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';

export class ReviewsRepository {
	constructor(private db: Database) {}

	async list(): Promise<Review[]> {
		return this.db.select().from(reviews).orderBy(desc(reviews.createdAt));
	}

	async getById(id: string): Promise<Review | null> {
		const result = await this.db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
		return result[0] ?? null;
	}

	async create(data: Omit<NewReview, 'id'>): Promise<Review> {
		const id = crypto.randomUUID();
		await this.db.insert(reviews).values({ id, ...data });
		const result = await this.db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
		return result[0]!;
	}

	async update(id: string, data: Partial<NewReview>): Promise<Review> {
		await this.db.update(reviews).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(reviews.id, id));
		const result = await this.db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
		return result[0]!;
	}

	async delete(id: string): Promise<void> {
		await this.db.delete(reviews).where(eq(reviews.id, id));
	}
}
