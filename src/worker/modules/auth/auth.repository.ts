import { eq } from 'drizzle-orm';
import { users, type User, type NewUser } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';

export class UserRepository {
	constructor(private db: Database) {}

	async findById(id: string): Promise<User | null> {
		const result = await this.db
			.select()
			.from(users)
			.where(eq(users.id, id))
			.limit(1);
		return result[0] ?? null;
	}

	async findByEmail(email: string): Promise<User | null> {
		const result = await this.db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);
		return result[0] ?? null;
	}

	async create(data: NewUser): Promise<User> {
		const id = data.id ?? crypto.randomUUID();
		const { id: _unused, ...dataWithoutId } = data;
		await this.db.insert(users).values({ id, ...dataWithoutId });
		const user = await this.findById(id);
		if (!user) {
			throw new Error('Failed to create user');
		}
		return user;
	}

	async update(id: string, data: Partial<Omit<NewUser, 'id'>>): Promise<User | null> {
		await this.db
			.update(users)
			.set({ ...data, updatedAt: new Date().toISOString() })
			.where(eq(users.id, id));
		return this.findById(id);
	}

	async delete(id: string): Promise<void> {
		await this.db.delete(users).where(eq(users.id, id));
	}
}
