import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@/worker/core/database';
import { WebhooksService } from '@/worker/modules/webhooks/webhooks.service';

describe('WebhooksService — Xendit reliability', () => {
	it('rejects a paid callback without invoice identifiers', async () => {
		const service = new WebhooksService({} as Database);

		await expect(service.handleXenditNotification({ status: 'PAID' }))
			.rejects.toThrow('external_id and id are required');
	});

	it('rejects unknown invoice statuses so the gateway can retry', async () => {
		const service = new WebhooksService({} as Database);

		await expect(service.handleXenditNotification({
			external_id: 'SVN-2026-0001',
			id: 'invoice-1',
			status: 'UNKNOWN',
		})).rejects.toThrow('Unknown Xendit invoice status');
	});

	it('does not acknowledge a paid callback when its payment row was not persisted', async () => {
		const limit = vi.fn()
			.mockResolvedValueOnce([{
				id: 'booking-1',
				bookingNumber: 'SVN-2026-0001',
				customerId: 'customer-1',
				vehicleId: 'vehicle-1',
				totalAmount: 100_000,
				dpPaidAt: null,
			}])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([]);
		const query = {
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			limit,
		};
		const insertError = new Error('D1 insert failed');
		const db = {
			select: vi.fn(() => query),
			insert: vi.fn(() => ({ values: vi.fn().mockRejectedValue(insertError) })),
		} as unknown as Database;
		const service = new WebhooksService(db);

		await expect(service.handleXenditNotification({
			external_id: 'SVN-2026-0001',
			id: 'invoice-1',
			status: 'PAID',
			paid_amount: 100_000,
		})).rejects.toThrow('D1 insert failed');
	});
});
