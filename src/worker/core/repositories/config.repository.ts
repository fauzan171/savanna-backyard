import { eq } from 'drizzle-orm';
import { systemConfiguration, type SystemConfiguration } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';

export class ConfigRepository {
	constructor(private db: Database) {}

	async get(key: string): Promise<SystemConfiguration | null> {
		const result = await this.db
			.select()
			.from(systemConfiguration)
			.where(eq(systemConfiguration.key, key))
			.limit(1);
		return result[0] ?? null;
	}

	async getValue(key: string): Promise<string | null> {
		const config = await this.get(key);
		return config?.value ?? null;
	}

	async set(key: string, value: string, description?: string, userId?: string): Promise<SystemConfiguration> {
		const existing = await this.get(key);

		if (existing) {
			await this.db
				.update(systemConfiguration)
				.set({
					value,
					description: description ?? existing.description,
					updatedAt: new Date().toISOString(),
					updatedBy: userId ?? null,
				})
				.where(eq(systemConfiguration.key, key));
			const updated = await this.get(key);
			if (!updated) {
				throw new Error('Failed to update configuration');
			}
			return updated;
		}

		const id = crypto.randomUUID();
		await this.db.insert(systemConfiguration).values({
			id,
			key,
			value,
			description: description ?? null,
			updatedBy: userId ?? null,
		});

		const created = await this.get(key);
		if (!created) {
			throw new Error('Failed to create configuration');
		}
		return created;
	}

	async delete(key: string): Promise<void> {
		await this.db
			.delete(systemConfiguration)
			.where(eq(systemConfiguration.key, key));
	}

	async getAll(): Promise<SystemConfiguration[]> {
		return this.db
			.select()
			.from(systemConfiguration)
			.orderBy(systemConfiguration.key);
	}

	// Helper for getting numeric values
	async getNumber(key: string, defaultValue: number): Promise<number> {
		const value = await this.getValue(key);
		if (value === null) return defaultValue;
		const parsed = parseFloat(value);
		return isNaN(parsed) ? defaultValue : parsed;
	}

	// Helper for getting boolean values
	async getBoolean(key: string, defaultValue: boolean): Promise<boolean> {
		const value = await this.getValue(key);
		if (value === null) return defaultValue;
		return value === 'true';
	}
}
