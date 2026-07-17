import { z } from 'zod';
import { ValidationError } from '@/worker/core/types/errors';

/**
 * Per-key validation for system_configuration values.
 * Values are stored as text, so numeric/URL rules are enforced here.
 *
 * ponytail: explicit key map, not a generic "any string allowed" — covers the
 * known seed keys. Unknown keys fall through to a non-empty sanitized string.
 * Add new keys here when introduced.
 */

// numeric: parse to int >= 0
const numericKey = z
	.string()
	.trim()
	.refine((s) => /^\d+$/.test(s), { message: 'Must be a non-negative integer' });

// URL must be http(s) — blocks javascript:/data:/vbscript:
const urlKey = z
	.string()
	.trim()
	.url('Invalid URL')
	.refine((u) => u.startsWith('http://') || u.startsWith('https://'), {
		message: 'URL must start with http:// or https://',
	});

const emailKey = z.string().trim().email('Invalid email address');

// phone: digits, +, spaces, dashes
const phoneKey = z
	.string()
	.trim()
	.regex(/^[0-9+\-\s]+$/, 'Phone must contain only digits, +, spaces or dashes');

const booleanKey = z.enum(['true', 'false']);

const SCHEMAS: Record<string, z.ZodType> = {
	contact_email: emailKey,
	contact_phone: phoneKey,
	whatsapp_number: phoneKey,
	instagram_url: urlKey,
	deposit_amount: numericKey,
	public_api_enabled: booleanKey,
};

const fallbackString = z.string().trim().min(1, 'Value is required').max(2000);

/** Validate a single setting value for the given key. Returns the normalized string. */
export function validateSettingValue(key: string, value: unknown): string {
	if (typeof value !== 'string') {
		throw new ValidationError('value must be a string');
	}
	const schema = SCHEMAS[key] ?? fallbackString;
	const result = schema.safeParse(value);
	if (!result.success) {
		throw new ValidationError(`${key}: ${result.error.errors.map((e) => e.message).join(', ')}`);
	}
	return result.data as string;
}
