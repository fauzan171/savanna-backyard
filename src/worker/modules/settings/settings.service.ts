import { ConfigRepository } from '@/worker/core/repositories/config.repository';

export class SettingsService {
	constructor(private configRepo: ConfigRepository) {}

	async list(): Promise<Array<{ key: string; value: string; description: string | null }>> {
		const configs = await this.configRepo.getAll();
		return configs.map(c => ({
			key: c.key,
			value: c.value,
			description: c.description,
		}));
	}

	async getByKey(key: string): Promise<{ key: string; value: string; description: string | null } | null> {
		const config = await this.configRepo.get(key);
		if (!config) return null;
		return {
			key: config.key,
			value: config.value,
			description: config.description,
		};
	}

	async update(key: string, value: string, userId?: string): Promise<{ key: string; value: string }> {
		const config = await this.configRepo.set(key, value, undefined, userId);
		return { key: config.key, value: config.value };
	}

	async bulkUpdate(settings: Array<{ key: string; value: string }>, userId?: string): Promise<Array<{ key: string; value: string }>> {
		const results: Array<{ key: string; value: string }> = [];
		for (const s of settings) {
			const config = await this.configRepo.set(s.key, s.value, undefined, userId);
			results.push({ key: config.key, value: config.value });
		}
		return results;
	}
}
