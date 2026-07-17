import { bookings, payments, customers, vehicles } from '@/worker/core/database/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { Database } from '@/worker/core/database';
import type { EmailService } from '@/worker/core/services/email.service';

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
	constructor(
		private db: Database,
		private emailService?: EmailService,
	) {}

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
		const rawExternalId = (data.external_id as string) ?? '';
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

		// Support remainder invoices: external_id = "{bookingNumber}-remainder"
		// Strip the suffix to get the base booking number.
		const isRemainder = rawExternalId.endsWith('-remainder');
		const externalId = isRemainder ? rawExternalId.slice(0, -'-remainder'.length) : rawExternalId;

		// Find booking by booking number (external_id is the booking number)
		const bookingResult = await this.db
			.select()
			.from(bookings)
			.where(eq(bookings.bookingNumber, externalId))
			.limit(1);

		if (bookingResult.length === 0) {
			console.error(`Booking not found for Xendit external_id: ${externalId} (raw: ${rawExternalId})`);
			return;
		}

		const booking = bookingResult[0]!;
		const now = new Date().toISOString();
		const isPaidEvent = ['PAID', 'SETTLED'].includes(invoiceStatus);

		// Resolve final statuses; branch DP vs full settlement on paid events
		let bookingStatus = statusMapping.bookingStatus;
		let paymentStatus = statusMapping.paymentStatus;
		const updateFields: Record<string, unknown> = { updatedAt: now };

		if (isPaidEvent) {
			// Idempotency: record the payment only once per Xendit invoice id
			const existing = await this.db
				.select({ id: payments.id })
				.from(payments)
				.where(eq(payments.transactionReference, invoiceId))
				.limit(1);
			if (existing.length === 0) {
				try {
					await this.db.insert(payments).values({
						id: crypto.randomUUID(),
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
					console.log('Payment record insert failed, skipping:', e);
				}
			}

			// Sum all verified payments to decide DP (partial) vs full settlement
			const paidRows = await this.db
				.select({ sum: sql<number>`COALESCE(SUM(${payments.amount}), 0)` })
				.from(payments)
				.where(and(eq(payments.bookingId, booking.id), eq(payments.status, 'Verified')));
			const totalPaid = Number(paidRows[0]?.sum ?? 0);
			const total = booking.totalAmount;
			const isFullyPaid = totalPaid >= total;

			if (isFullyPaid) {
				bookingStatus = 'Confirmed';
				paymentStatus = 'settlement';
				updateFields.fullyPaidAt = now;
				updateFields.remainingAmount = 0;
			} else {
				// Partial payment => down-payment (DP). Booking stays pending until fully paid.
				bookingStatus = 'pending_payment';
				paymentStatus = 'dp_paid';
				if (!booking.dpPaidAt) updateFields.dpPaidAt = now;
				updateFields.remainingAmount = Math.max(0, total - totalPaid);
			}
			updateFields.paidAt = paidAt ?? now;
		}

		updateFields.status = bookingStatus as typeof bookings.$inferSelect.status;
		updateFields.paymentStatus = paymentStatus;

		await this.db.update(bookings).set(updateFields).where(eq(bookings.id, booking.id));

		// Send payment confirmation email on paid events (full or DP)
		if (isPaidEvent && this.emailService) {
			try {
				// Fetch customer and vehicle details for email
				const customerResult = await this.db
					.select()
					.from(customers)
					.where(eq(customers.id, booking.customerId))
					.limit(1);

				const vehicleResult = await this.db
					.select()
					.from(vehicles)
					.where(eq(vehicles.id, booking.vehicleId))
					.limit(1);

				const customer = customerResult[0];
				const vehicle = vehicleResult[0];

				if (customer?.email) {
					const emailSent = await this.emailService.sendPaymentConfirmation({
						customerName: customer.name,
						customerEmail: customer.email,
						bookingNumber: booking.bookingNumber,
						vehicleName: vehicle?.name ?? 'Unknown Vehicle',
						startDate: booking.startDate,
						endDate: booking.endDate,
						totalAmount: amount,
						paymentMethod: paymentMethod === 'QRIS' ? 'QRIS' : 'Virtual Account',
						paidAt: paidAt ?? now,
					});

					if (emailSent) {
						console.log(`Payment confirmation email sent to ${customer.email}`);
					} else {
						console.error(`Failed to send payment confirmation email to ${customer.email}`);
					}
				} else {
					console.log(`Customer email not available for booking ${booking.bookingNumber}`);
				}
			} catch (emailError) {
				// Don't fail the webhook if email fails
				console.error('Error sending payment confirmation email:', emailError);
			}
		}
	}
}
