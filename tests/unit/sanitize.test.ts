import { describe, it, expect } from 'vitest';
import { sanitizeText } from '@/worker/core/lib/sanitize';

describe('sanitizeText (XSS defense, VEH-03/CUST-01/LEAD-E03/FRM-02/SEC-01)', () => {
	it('strips <script> tags, keeps inner text', () => {
		expect(sanitizeText('<script>alert(1)</script>')).toBe('alert(1)');
	});

	it('strips <img onerror> payload entirely', () => {
		expect(sanitizeText('<img src=x onerror=alert("xss")>')).toBe('');
	});

	it('removes stray angle brackets', () => {
		expect(sanitizeText('a < b > c')).toBe('a  b  c');
	});

	it('passes plain names untouched', () => {
		expect(sanitizeText('Budi Santoso')).toBe('Budi Santoso');
	});

	it('is wired into customer create DTO', async () => {
		const { createCustomerSchema } = await import('@/worker/modules/customers/customers.dto');
		const r = createCustomerSchema.safeParse({
			name: '<script>alert("xss-cust")</script>',
			phone: '+6281234567',
		});
		expect(r.success).toBe(true);
		expect((r as any).data.name).toBe('alert("xss-cust")');
	});
});
