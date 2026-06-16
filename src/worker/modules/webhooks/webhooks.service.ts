import { bookings, payments } from '@/worker/core/database/schema';
import { eq } from 'drizzle-orm';
import type { Database } from '@/worker/core/database';

// Status mapping from Midtrans transaction_status to booking status + payment_status
const MIDTRANS_STATUS_MAP: Record<string, { bookingStatus: string; paymentStatus: string }> = {
	capture: { bookingStatus: 'Confirmed', paymentStatus: 'settlement' },
	settlement: { bookingStatus: 'Confirmed', paymentStatus: 'settlement' },
	pending: { bookingStatus: 'pending_payment', paymentStatus: 'pending' },
	deny: { bookingStatus: 'payment_failed', paymentStatus: 'deny' },
	expire: { bookingStatus: 'expired', paymentStatus: 'expire' },
	cancel: { bookingStatus: 'Cancelled', paymentStatus: 'cancel' },
	refund: { bookingStatus: 'refunded', paymentStatus: 'refund' },
};

// Status mapping from iFortePay transaction_status to booking status + payment_status
const IFORTEPAY_STATUS_MAP: Record<string, { bookingStatus: string; paymentStatus: string }> = {
	SUCCESS: { bookingStatus: 'Confirmed', paymentStatus: 'settlement' },
	EXPIRED: { bookingStatus: 'expired', paymentStatus: 'expire' },
	FAILED: { bookingStatus: 'payment_failed', paymentStatus: 'deny' },
};

// Status mapping from Xendit invoice status to booking status + payment_status
const XENDIT_STATUS_MAP: Record<string, { bookingStatus: string; paymentStatus: string }> = {
	PAID: { bookingStatus: 'Confirmed', paymentStatus: 'settlement' },
	SETTLED: { bookingStatus: 'Confirmed', paymentStatus: 'settlement' },
	PENDING: { bookingStatus: 'pending_payment', paymentStatus: 'pending' },
	EXPIRED: { bookingStatus: 'expired', paymentStatus: 'expire' },
	FAILED: { bookingStatus: 'payment_failed', paymentStatus: 'deny' },
};

export class WebhooksService {
	constructor(private db: Database) {}

	async verifySignature(data: Record<string, string>, serverKey: string): Promise<boolean> {
		const raw = `${data.order_id}${data.status_code}${data.gross_amount}${serverKey}`;
		const encoded = new TextEncoder().encode(raw);
		const hashBuffer = await crypto.subtle.digest('SHA-512', encoded);
		const computed = Array.from(new Uint8Array(hashBuffer))
			.map(b => b.toString(16).padStart(2, '0'))
			.join('');
		return computed === data.signature_key;
	}

	async handleMidtransNotification(data: Record<string, string>): Promise<void> {
		const { order_id, transaction_status, transaction_id, payment_type, gross_amount } = data;

		const statusMapping = MIDTRANS_STATUS_MAP[transaction_status];
		if (!statusMapping) {
			console.error(`Unknown transaction_status: ${transaction_status}`);
			return;
		}

		// Find booking by booking number (order_id)
		const bookingResult = await this.db
			.select()
			.from(bookings)
			.where(eq(bookings.bookingNumber, order_id))
			.limit(1);

		if (bookingResult.length === 0) {
			console.error(`Booking not found for order_id: ${order_id}`);
			return;
		}

		const booking = bookingResult[0]!;

		// Update booking status
		const now = new Date().toISOString();
		await this.db
			.update(bookings)
			.set({
				status: statusMapping.bookingStatus as typeof bookings.$inferSelect.status,
				paymentStatus: statusMapping.paymentStatus,
				paidAt: ['capture', 'settlement'].includes(transaction_status) ? now : null,
				updatedAt: now,
			})
			.where(eq(bookings.id, booking.id));

		// If payment successful, create payment record
		if (['capture', 'settlement'].includes(transaction_status)) {
			try {
				const paymentId = crypto.randomUUID();
				await this.db.insert(payments).values({
					id: paymentId,
					bookingId: booking.id,
					amount: parseFloat(gross_amount),
					currency: 'IDR',
					method: payment_type === 'qris' ? 'QRIS' : 'BankTransfer',
					status: 'Verified',
					transactionReference: transaction_id,
					verifiedAt: now,
					verifiedBy: null,
					notes: 'Auto-verified via Midtrans webhook',
					createdAt: now,
					updatedAt: now,
				});
			} catch (e) {
				console.log('Payment record may already exist, skipping:', e);
			}
		}
	}

	async handleiFortePayNotification(data: Record<string, unknown>): Promise<void> {
		const orderId = data.order_id as string;
		const transactionStatus = data.transaction_status as string;
		const transactionId = data.transaction_id as string;
		const paymentMethod = data.payment_method as string;
		const amount = data.amount as number;
		const paidDate = data.paid_date as string | undefined;

		const statusMapping = IFORTEPAY_STATUS_MAP[transactionStatus];
		if (!statusMapping) {
			console.error(`Unknown iFortePay transaction_status: ${transactionStatus}`);
			return;
		}

		// Find booking by booking number (order_id)
		const bookingResult = await this.db
			.select()
			.from(bookings)
			.where(eq(bookings.bookingNumber, orderId))
			.limit(1);

		if (bookingResult.length === 0) {
			console.error(`Booking not found for order_id: ${orderId}`);
			return;
		}

		const booking = bookingResult[0]!;

		// Update booking status
		const now = new Date().toISOString();
		await this.db
			.update(bookings)
			.set({
				status: statusMapping.bookingStatus as typeof bookings.$inferSelect.status,
				paymentStatus: statusMapping.paymentStatus,
				paidAt: transactionStatus === 'SUCCESS' ? (paidDate ?? now) : null,
				updatedAt: now,
			})
			.where(eq(bookings.id, booking.id));

		// If payment successful, create payment record
		if (transactionStatus === 'SUCCESS') {
			try {
				const paymentId = crypto.randomUUID();
				await this.db.insert(payments).values({
					id: paymentId,
					bookingId: booking.id,
					amount,
					currency: 'IDR',
					method: paymentMethod === 'QRIS' ? 'QRIS' : 'Gateway',
					status: 'Verified',
					transactionReference: transactionId,
					verifiedAt: now,
					verifiedBy: null,
					notes: 'Auto-verified via iFortePay webhook',
					createdAt: now,
					updatedAt: now,
				});
			} catch (e) {
				console.log('Payment record may already exist, skipping:', e);
			}
		}
	}

	/**
	 * Handle Xendit invoice webhook notification.
	 * The webhook is verified in the route handler via X-CALLBACK-TOKEN header.
	 * Xendit sends the invoice object with status: PAID | SETTLED | PENDING | EXPIRED | FAILED
	 *
	 * Docs: https://developers.xendit.co/api-reference/#webhooks
	 */
	async handleXenditNotification(data: Record<string, unknown>): Promise<void> {
		const externalId = (data.external_id as string) ?? '';
		const invoiceStatus = (data.status as string) ?? '';
		const invoiceId = (data.id as string) ?? '';
		const paymentMethod = (data.payment_method as string) ?? 'Gateway';
		const amount = (data.paid_amount as number) ?? (data.amount as number) ?? 0;
		const paidAt = data.paid_at as string | undefined;

		const statusMapping = XENDIT_STATUS_MAP[invoiceStatus];
		if (!statusMapping) {
			console.error(`Unknown Xendit invoice status: ${invoiceStatus}`);
			return;
		}

		// Find booking by booking number (external_id is the booking number)
		const bookingResult = await this.db
			.select()
			.from(bookings)
			.where(eq(bookings.bookingNumber, externalId))
			.limit(1);

		if (bookingResult.length === 0) {
			console.error(`Booking not found for Xendit external_id: ${externalId}`);
			return;
		}

		const booking = bookingResult[0]!;

		// Update booking status
		const now = new Date().toISOString();
		await this.db
			.update(bookings)
			.set({
				status: statusMapping.bookingStatus as typeof bookings.$inferSelect.status,
				paymentStatus: statusMapping.paymentStatus,
				paidAt: ['PAID', 'SETTLED'].includes(invoiceStatus) ? (paidAt ?? now) : null,
				updatedAt: now,
			})
			.where(eq(bookings.id, booking.id));

		// If payment successful, create payment record
		if (['PAID', 'SETTLED'].includes(invoiceStatus)) {
			try {
				const paymentId = crypto.randomUUID();
				await this.db.insert(payments).values({
					id: paymentId,
					bookingId: booking.id,
					amount,
					currency: 'IDR',
					method: paymentMethod === 'QRIS' ? 'QRIS' : 'Gateway',
					status: 'Verified',
					transactionReference: invoiceId,
					verifiedAt: now,
					verifiedBy: null,
					notes: 'Auto-verified via Xendit webhook',
					createdAt: now,
					updatedAt: now,
				});
			} catch (e) {
				console.log('Payment record may already exist, skipping:', e);
			}
		}
	}
}
