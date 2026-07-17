import { describe, it, expect } from 'vitest';
import { validateSettingValue } from '@/worker/modules/settings/settings.dto';

describe('validateSettingValue (SET-02 / SET-03)', () => {
	it('rejects negative deposit_amount', () => {
		expect(() => validateSettingValue('deposit_amount', '-50000')).toThrow();
	});

	it('rejects non-numeric deposit_amount', () => {
		expect(() => validateSettingValue('deposit_amount', 'abc')).toThrow();
	});

	it('accepts valid deposit_amount', () => {
		expect(validateSettingValue('deposit_amount', '500000')).toBe('500000');
	});

	it('rejects javascript: / XSS instagram_url', () => {
		expect(() => validateSettingValue('instagram_url', 'javascript:alert(1)')).toThrow();
		expect(() => validateSettingValue('instagram_url', '<script>alert(1)</script>')).toThrow();
	});

	it('accepts https instagram_url', () => {
		expect(validateSettingValue('instagram_url', 'https://instagram.com/savannabromo')).toBe('https://instagram.com/savannabromo');
	});

	it('rejects invalid contact_email', () => {
		expect(() => validateSettingValue('contact_email', 'bukanemail')).toThrow();
	});

	it('falls back to non-empty string for unknown keys', () => {
		expect(validateSettingValue('location', 'Malang')).toBe('Malang');
		expect(() => validateSettingValue('location', '')).toThrow();
	});
});
