import { eq } from 'drizzle-orm';
import { users, type User, type NewUser } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';

export class UsersRepository {
	constructor(private db: Database) {}

	async list(): Promise<User[]> {
		return this.db.select().from(users);
	}

	async getById(id: string): Promise<User | null> {
		const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
		return result[0] ?? null;
	}

	async getByEmail(email: string): Promise<User | null> {
		const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
		return result[0] ?? null;
	}

	async create(data: Omit<NewUser, 'id'>): Promise<User> {
		const id = crypto.randomUUID();
		await this.db.insert(users).values({ id, ...data });
		const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
		return result[0]!;
	}

	async update(id: string, data: Partial<NewUser>): Promise<User> {
		await this.db.update(users).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(users.id, id));
		const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
		return result[0]!;
	}
}
