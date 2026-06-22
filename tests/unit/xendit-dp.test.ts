import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { XenditGateway } from '@/worker/core/services/payment-gateway/xendit.gateway';

describe('XenditGateway — allow_partial (down-payment)', () => {
	let fetchMock: ReturnType<typeof vi.fn>;
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		fetchMock = vi.fn();
		globalThis.fetch = fetchMock as unknown as typeof fetch;
	});
	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	const gateway = () => new XenditGateway({ apiKey: 'xnd_test_key', webhookToken: 'wt', isProduction: false });

	it('[P0] includes allow_partial + minimum_amount (the DP) when allowPartial=true', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ id: 'inv-1', invoice_url: 'https://xendit.co/i/1', qr_code: { qr_string: 'q' } }),
		});

		await gateway().createPayment({
			amount: 1_000_000, currency: 'IDR', method: 'Gateway', bookingId: 'SVN-2026-0001',
			allowPartial: true, minimumAmount: 300_000,
		});

		const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
		expect(body.amount).toBe(1_000_000); // invoice is for the FULL amount
		expect(body.allow_partial).toBe(true);
		expect(body.minimum_amount).toBe(300_000); // customer may pay at least the DP
	});

	it('[P0] omits allow_partial for a full (non-DP) payment', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'inv-2', invoice_url: 'https://xendit.co/i/2' }) });

		await gateway().createPayment({ amount: 500_000, currency: 'IDR', method: 'Gateway', bookingId: 'SVN-2026-0002' });

		const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
		expect(body.allow_partial).toBeUndefined();
		expect(body.minimum_amount).toBeUndefined();
	});

	it('[P0] returns the Xendit invoice id as transactionId (needed to reopen for remainder)', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'inv-9', invoice_url: 'https://xendit.co/i/9' }) });
		const res = await gateway().createPayment({ amount: 100, currency: 'IDR', method: 'Gateway', bookingId: 'B1', allowPartial: true, minimumAmount: 30 });
		expect(res.success).toBe(true);
		expect(res.transactionId).toBe('inv-9');
	});
});
