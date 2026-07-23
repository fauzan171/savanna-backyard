import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { ValidationError } from '@/worker/core/types/errors';
import { settingItemSchema, sanitizeSettingValue } from './settings.dto';

export class SettingsService {
	constructor(private configRepo: ConfigRepository) {}

	async list(): Promise<Array<{ key: string; value: string; description: string | null }>> {
		const configs = await this.configRepo.getAll();
		return configs.map((c) => ({
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
		// SET-02 / SET-03: enforce per-key semantics even on single-key update
		const parsed = settingItemSchema.safeParse({ key, value });
		if (!parsed.success) {
			const msg = parsed.error.issues.map((i) => i.message).join(', ');
			throw new ValidationError(msg);
		}
		const config = await this.configRepo.set(key, sanitizeSettingValue(value), undefined, userId);
		return { key: config.key, value: config.value };
	}

	async bulkUpdate(
		settings: Array<{ key: string; value: string }>,
		userId?: string,
	): Promise<Array<{ key: string; value: string }>> {
		const results: Array<{ key: string; value: string }> = [];
		for (const s of settings) {
			// Per-item validation already ran in the DTO layer, but sanitize here
			// to neutralize any remaining XSS vectors before persistence.
			const config = await this.configRepo.set(s.key, sanitizeSettingValue(s.value), undefined, userId);
			results.push({ key: config.key, value: config.value });
		}
		return results;
	}
}
