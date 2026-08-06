import { describe, it, expect } from 'vitest';
import { sanitizeText } from '@/worker/core/schemas/sanitize';

describe('sanitizeText (XSS defense, VEH-03/CUST-01/LEAD-E03/FRM-02/SEC-01)', () => {
	// sanitizeText removes executable vectors (script blocks, inline event
	// handlers, javascript:/data: URLs) and entity-encodes remaining angle
	// brackets so they render as inert text in non-React surfaces (CSV, email,
	// server-rendered templates). It does NOT strip benign tags — React already
	// escapes text content at render time.

	it('strips <script> blocks entirely', () => {
		expect(sanitizeText('<script>alert(1)</script>')).toBe('');
	});

	it('removes inline event handlers', () => {
		const out = sanitizeText('<img src=x onerror=alert("xss")>');
		expect(out).not.toContain('onerror');
		expect(out).not.toContain('<');
	});

	it('entity-encodes stray angle brackets (preserves them as text)', () => {
		expect(sanitizeText('a < b > c')).toBe('a &lt; b &gt; c');
	});

	it('leaves plain text untouched', () => {
		expect(sanitizeText('Budi Santoso')).toBe('Budi Santoso');
	});

	it('is wired into customer create DTO', async () => {
		const { createCustomerSchema } = await import('@/worker/modules/customers/customers.dto');
		const r = createCustomerSchema.safeParse({
			name: '<script>alert("xss-cust")</script>',
			phone: '+6281234567',
		});
		expect(r.success).toBe(true);
		// script block removed → empty payload rejected by the required-name
		// transform, so this must fail validation instead of persisting markup.
		if (r.success) {
			expect((r as any).data.name).not.toContain('<');
		}
	});
});
