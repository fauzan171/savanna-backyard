import { z } from 'zod';
import { sanitizeText } from '@/worker/core/schemas/sanitize';

/**
 * Per-key validation for system settings (SET-02, SET-03).
 *
 * Settings are a generic key/value store, but certain keys have semantic
 * meaning (numeric deposit, URLs, contact identifiers) and must be validated
 * before being persisted. Unknown keys are accepted as-is (sanitized as text)
 * to remain forward-compatible with new settings added via the UI.
 */

// SET-03: reject dangerous URI schemes (javascript:, data:text/html, vbscript:)
const safeUrlScheme = (val: string): boolean => {
	const trimmed = val.trim().toLowerCase();
	const dangerous = ['javascript:', 'vbscript:', 'data:text/html'];
	return !dangerous.some((scheme) => trimmed.startsWith(scheme));
};

// SET-02: numeric keys must parse to a non-negative finite number
const numericKeys = new Set([
	'deposit_amount',
	'deposit_amount_idr',
	'late_return_fee',
	'cancellation_fee',
	'usd_rate', // LC-003: IDR-per-USD display rate for the public storefront
]);

// SET-03: keys expected to hold a URL
const urlKeys = new Set([
	'site_url',
	'website_url',
	'instagram_url',
	'facebook_url',
	'tiktok_url',
	'youtube_url',
	'logo_url',
]);

// Validate a single {key, value} pair based on its key semantics.
export const settingItemSchema = z
	.object({
		key: z.string().trim().min(1).max(100),
		value: z.string().max(5000),
	})
	.superRefine((item, ctx) => {
		const { key, value } = item;

		if (numericKeys.has(key)) {
			// SET-02: must be a non-negative number
			const n = Number(value);
			if (Number.isNaN(n) || !Number.isFinite(n) || n < 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `${key} must be a non-negative number`,
					path: ['value'],
				});
				return;
			}
		}

		if (urlKeys.has(key)) {
			// SET-03: must be a safe URL (http/https) or a relative path
			if (!safeUrlScheme(value)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `${key} must not use a dangerous URL scheme`,
					path: ['value'],
				});
				return;
			}
			const ok =
				value.startsWith('/') ||
				(/^https?:\/\//i.test(value) && (() => { try { new URL(value); return true; } catch { return false; } })());
			if (!ok) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `${key} must be a valid http(s) URL`,
					path: ['value'],
				});
			}
		}
	});

// Bulk update: array of validated setting items
export const bulkUpdateSettingsSchema = z.object({
	settings: z.array(settingItemSchema).min(1, 'settings array is required'),
});

// Update by key: { value }
export const updateByKeySchema = z.object({
	value: z.string().max(5000),
});

export type BulkUpdateSettingsRequest = z.infer<typeof bulkUpdateSettingsSchema>;
export type UpdateByKeyRequest = z.infer<typeof updateByKeySchema>;

/**
 * Sanitize a setting value before persistence. Free-text settings are
 * sanitized for XSS; numeric/URL settings are stored as validated above.
 */
export function sanitizeSettingValue(value: string): string {
	return sanitizeText(value) as string;
}
