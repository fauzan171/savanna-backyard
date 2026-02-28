import { eq, or, like, and, desc } from 'drizzle-orm';
import { customers, type Customer, type NewCustomer } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';
import type { ListCustomersQuery } from './customers.dto';

export class CustomersRepository {
	constructor(private db: Database) {}

	async findById(id: string): Promise<Customer | null> {
		const result = await this.db
			.select()
			.from(customers)
			.where(eq(customers.id, id))
			.limit(1);
		return result[0] ?? null;
	}

	async findByPhone(phone: string): Promise<Customer | null> {
		const result = await this.db
			.select()
			.from(customers)
			.where(eq(customers.phone, phone))
			.limit(1);
		return result[0] ?? null;
	}

	async findByEmail(email: string): Promise<Customer | null> {
		const result = await this.db
			.select()
			.from(customers)
			.where(eq(customers.email, email))
			.limit(1);
		return result[0] ?? null;
	}

	async list(query: ListCustomersQuery): Promise<{ items: Customer[]; total: number }> {
		const offset = (query.page - 1) * query.limit;

		// Build where conditions
		const conditions = [];

		if (query.search) {
			const searchPattern = `%${query.search}%`;
			conditions.push(
				or(
					like(customers.name, searchPattern),
					like(customers.phone, searchPattern),
					like(customers.email, searchPattern)
				)
			);
		}

		if (query.blacklist !== undefined) {
			conditions.push(eq(customers.isBlacklisted, query.blacklist));
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		// Get items
		const items = await this.db
			.select()
			.from(customers)
			.where(whereClause)
			.orderBy(desc(customers.createdAt))
			.limit(query.limit)
			.offset(offset);

		// Get total count
		const countResult = await this.db
			.select({ id: customers.id })
			.from(customers)
			.where(whereClause);

		const total = countResult.length;

		return { items, total };
	}

	async create(data: Omit<NewCustomer, 'id'>): Promise<Customer> {
		const id = crypto.randomUUID();
		await this.db.insert(customers).values({ id, ...data });
		const customer = await this.findById(id);
		if (!customer) {
			throw new Error('Failed to create customer');
		}
		return customer;
	}

	async update(id: string, data: Partial<Omit<NewCustomer, 'id' | 'createdAt'>>): Promise<Customer | null> {
		await this.db
			.update(customers)
			.set({ ...data, updatedAt: new Date().toISOString() })
			.where(eq(customers.id, id));
		return this.findById(id);
	}

	async setBlacklist(id: string, isBlacklisted: boolean, reason: string | null): Promise<Customer | null> {
		return this.update(id, {
			isBlacklisted,
			blacklistReason: isBlacklisted ? reason : null,
		});
	}

	async checkExists(id: string): Promise<boolean> {
		const result = await this.findById(id);
		return result !== null;
	}
}
