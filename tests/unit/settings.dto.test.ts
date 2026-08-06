import { describe, it, expect } from 'vitest';
import { settingItemSchema } from '@/worker/modules/settings/settings.dto';

// Per-key validation lives in settingItemSchema (superRefine). Exercise it
// via safeParse({ key, value }) — the real contract used by the routes.
const validate = (key: string, value: string) =>
	settingItemSchema.safeParse({ key, value });

describe('settingItemSchema (SET-02 / SET-03)', () => {
	it('rejects negative deposit_amount', () => {
		expect(validate('deposit_amount', '-50000').success).toBe(false);
	});

	it('rejects non-numeric deposit_amount', () => {
		expect(validate('deposit_amount', 'abc').success).toBe(false);
	});

	it('accepts valid deposit_amount', () => {
		expect(validate('deposit_amount', '500000').success).toBe(true);
	});

	it('rejects javascript: / XSS instagram_url', () => {
		expect(validate('instagram_url', 'javascript:alert(1)').success).toBe(false);
		expect(validate('instagram_url', '<script>alert(1)</script>').success).toBe(false);
	});

	it('accepts https instagram_url', () => {
		expect(validate('instagram_url', 'https://instagram.com/savannabromo').success).toBe(true);
	});

	it('accepts non-empty string for unknown keys', () => {
		expect(validate('location', 'Malang').success).toBe(true);
	});
	// ponytail: contact_email format check is not enforced — key is unknown to
	// the validator. Add an emailKeys set if/when the UI requires it.
});
