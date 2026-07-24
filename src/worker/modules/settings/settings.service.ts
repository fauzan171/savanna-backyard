import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { ValidationError } from '@/worker/core/types/errors';
import { settingItemSchema, sanitizeSettingValue } from './settings.dto';

/**
 * Keys whose values are secrets and must never be exposed to non-SUPER_ADMIN
 * users. A3 fix: previously list()/getByKey() returned every config row
 * verbatim, leaking payment-gateway server keys and API keys to STAFF users.
 */
const SECRET_KEY_PATTERNS = [
	/_key$/i,
	/_secret$/i,
	/_token$/i,
	/_password$/i,
];

const SECRET_KEY_EXACT = new Set([
	'public_api_key',
	'midtrans_server_key',
	'midtrans_client_key',
	'xendit_api_key',
	'xendit_webhook_token',
	'ifortepay_hash_key',
	'ifortepay_secret_unbound_id',
	'whatsapp_api_key',
	'google_oauth_client_secret',
	'resend_api_key',
]);

function isSecretKey(key: string): boolean {
	if (SECRET_KEY_EXACT.has(key)) return true;
	return SECRET_KEY_PATTERNS.some((re) => re.test(key));
}

const REDACTED = '***';

export class SettingsService {
	constructor(private configRepo: ConfigRepository) {}

	async list(
		role: 'SUPER_ADMIN' | 'STAFF' = 'STAFF',
	): Promise<Array<{ key: string; value: string; description: string | null }>> {
		const configs = await this.configRepo.getAll();
		const redact = role !== 'SUPER_ADMIN';
		return configs.map((c) => ({
			key: c.key,
			value: redact && isSecretKey(c.key) ? REDACTED : c.value,
			description: c.description,
		}));
	}

	async getByKey(
		key: string,
		role: 'SUPER_ADMIN' | 'STAFF' = 'STAFF',
	): Promise<{ key: string; value: string; description: string | null } | null> {
		const config = await this.configRepo.get(key);
		if (!config) return null;
		const redact = role !== 'SUPER_ADMIN';
		return {
			key: config.key,
			value: redact && isSecretKey(config.key) ? REDACTED : config.value,
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
