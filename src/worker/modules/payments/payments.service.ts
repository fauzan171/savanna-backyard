import { PaymentsRepository } from './payments.repository';
import { BookingsRepository } from '../bookings/bookings.repository';
import { ConflictError, NotFoundError, ValidationError } from '@/worker/core/types/errors';
import type {
	PaymentResponse,
	PaymentWithDetails,
	VerifyPaymentResult,
	PaymentSummary,
	PendingPaymentItem,
	PaymentStats,
} from './payments.types';
import type {
	CreatePaymentRequest,
	VerifyPaymentRequest,
	RejectPaymentRequest,
	ListPaymentsQuery,
} from './payments.dto';
import type { Payment } from '@/worker/core/database/schema';

export class PaymentsService {
	constructor(
		private paymentRepo: PaymentsRepository,
		private bookingRepo: BookingsRepository
	) {}

	// Transform payment to response format
	private async toResponse(payment: Payment): Promise<PaymentResponse> {
		const details = await this.paymentRepo.getPaymentWithDetails(payment.id);
		if (!details) {
			throw new NotFoundError('Payment details');
		}

		return {
			id: payment.id,
			bookingId: payment.bookingId,
			booking: {
				id: details.booking.id,
				bookingNumber: details.booking.bookingNumber,
				customerName: details.customer.name,
			},
			amount: payment.amount,
			currency: payment.currency,
			method: payment.method,
			status: payment.status,
			transactionReference: payment.transactionReference,
			verifiedBy: details.verifier,
			verifiedAt: payment.verifiedAt,
			notes: payment.notes,
			createdAt: payment.createdAt,
			updatedAt: payment.updatedAt,
		};
	}

	async list(query: ListPaymentsQuery): Promise<{
		items: PaymentResponse[];
		meta: { page: number; limit: number; total: number; totalPages: number };
	}> {
		const { items, total } = await this.paymentRepo.list(query);
		const totalPages = Math.ceil(total / query.limit);

		const responses = await Promise.all(
			items.map((payment) => this.toResponse(payment))
		);

		return {
			items: responses,
			meta: {
				page: query.page,
				limit: query.limit,
				total,
				totalPages,
			},
		};
	}

	async getById(id: string): Promise<PaymentWithDetails | null> {
		const payment = await this.paymentRepo.findById(id);
		if (!payment) return null;

		const details = await this.paymentRepo.getPaymentWithDetails(id);
		if (!details) return null;

		const response = await this.toResponse(payment);

		return {
			...response,
			booking: {
				...response.booking,
				customer: {
					id: details.customer.id,
					name: details.customer.name,
					phone: details.customer.phone,
				},
				vehicle: {
					id: details.vehicle.id,
					name: details.vehicle.name,
				},
				totalAmount: details.booking.totalAmount,
				status: details.booking.status,
			},
			gatewayResponse: {
				paymentUrl: null,
				paidAt: payment.verifiedAt,
			},
		};
	}

	async create(data: CreatePaymentRequest): Promise<PaymentResponse> {
		// Validate booking exists
		const booking = await this.bookingRepo.findById(data.bookingId);
		if (!booking) {
			throw new NotFoundError('Booking');
		}

		// Validate currency matches booking
		if (data.currency !== booking.currency) {
			throw new ValidationError(
				`Payment currency (${data.currency}) must match booking currency (${booking.currency})`
			);
		}

		// Idempotency check: if transaction reference provided, check for duplicates
		if (data.transactionReference) {
			const existingPayment = await this.paymentRepo.findByTransactionReference(data.transactionReference);
			if (existingPayment) {
				throw new ConflictError(
					`Payment with transaction reference '${data.transactionReference}' already exists`
				);
			}
		}

		// Validate payment amount doesn't exceed remaining balance (warning only, don't block)
		const existingPayments = await this.paymentRepo.getByBookingId(data.bookingId);
		const totalPaid = existingPayments
			.filter((p) => p.status === 'Verified')
			.reduce((sum, p) => sum + p.amount, 0);
		const remaining = booking.totalAmount - totalPaid;

		// Allow overpayment but add a note (business decision)
		let notes = data.notes ?? null;
		if (data.amount > remaining) {
			notes = notes
				? `${notes}\n\n[Warning] Payment amount exceeds remaining balance by ${data.amount - remaining}`
				: `[Warning] Payment amount exceeds remaining balance by ${data.amount - remaining}`;
		}

		const payment = await this.paymentRepo.create({
			bookingId: data.bookingId,
			amount: data.amount,
			currency: data.currency,
			method: data.method,
			status: 'Pending',
			transactionReference: data.transactionReference ?? null,
			verifiedBy: null,
			verifiedAt: null,
			notes,
		});

		return this.toResponse(payment);
	}

	async verify(id: string, userId: string, data: VerifyPaymentRequest): Promise<VerifyPaymentResult> {
		const payment = await this.paymentRepo.findById(id);
		if (!payment) {
			throw new NotFoundError('Payment');
		}

		// Validate current status
		if (payment.status !== 'Pending') {
			throw new ConflictError(`Cannot verify payment with status: ${payment.status}`);
		}

		// Get user info for response
		const details = await this.paymentRepo.getPaymentWithDetails(id);
		if (!details) {
			throw new NotFoundError('Payment details');
		}

		// Verify the payment
		const updated = await this.paymentRepo.verify(id, userId, data.notes ?? undefined);
		if (!updated) {
			throw new NotFoundError('Payment');
		}

		// Get booking to check if we should auto-confirm
		const booking = await this.bookingRepo.findById(payment.bookingId);

		// Auto-confirm booking if it's pending and this is the first verified payment
		let bookingStatus = booking?.status ?? 'Pending';
		if (booking && booking.status === 'Pending') {
			// Check if this is the first verified payment
			const payments = await this.paymentRepo.getByBookingId(booking.id);
			const verifiedPayments = payments.filter((p) => p.status === 'Verified');

			if (verifiedPayments.length === 1) {
				// This is the first verified payment, auto-confirm
				await this.bookingRepo.confirm(booking.id);
				// TC-BK-003: record the transition so the History tab is not empty
				await this.bookingRepo.logStatusChange(booking.id, 'Pending', 'Confirmed', userId, 'Auto-confirmed: payment verified');
				bookingStatus = 'Confirmed';
			}
		}

		// Get payment summary
		const summary = await this.paymentRepo.getPaymentSummary(payment.bookingId);

		return {
			id: updated.id,
			status: 'Verified',
			verifiedBy: {
				id: userId,
				name: details.verifier?.name ?? 'Unknown',
			},
			verifiedAt: updated.verifiedAt ?? new Date().toISOString(),
			bookingStatus,
			paymentSummary: {
				totalPaid: summary.totalPaid,
				remaining: summary.remaining,
				isFullyPaid: summary.isFullyPaid,
			},
		};
	}

	async reject(id: string, data: RejectPaymentRequest): Promise<PaymentResponse> {
		const payment = await this.paymentRepo.findById(id);
		if (!payment) {
			throw new NotFoundError('Payment');
		}

		// Validate current status
		if (payment.status !== 'Pending') {
			throw new ConflictError(`Cannot reject payment with status: ${payment.status}`);
		}

		const updated = await this.paymentRepo.reject(id, data.reason);
		if (!updated) {
			throw new NotFoundError('Payment');
		}

		return this.toResponse(updated);
	}

	async getBookingSummary(bookingId: string): Promise<PaymentSummary> {
		const booking = await this.bookingRepo.findById(bookingId);
		if (!booking) {
			throw new NotFoundError('Booking');
		}

		const payments = await this.paymentRepo.getByBookingId(bookingId);
		const summary = await this.paymentRepo.getPaymentSummary(bookingId);

		return {
			bookingId: booking.id,
			bookingNumber: booking.bookingNumber,
			totalAmount: booking.totalAmount,
			currency: booking.currency,
			paymentTerms: booking.paymentTerms,
			payments: payments.map((p) => ({
				id: p.id,
				amount: p.amount,
				method: p.method,
				status: p.status,
				createdAt: p.createdAt,
			})),
			summary: {
				totalPaid: summary.totalPaid,
				pendingAmount: summary.pendingAmount,
				remaining: summary.remaining,
				isFullyPaid: summary.isFullyPaid,
				paymentProgress: summary.paymentProgress,
			},
		};
	}

	async getPendingPayments(): Promise<{ items: PendingPaymentItem[]; total: number }> {
		const pendingData = await this.paymentRepo.getPendingPayments();

		const items: PendingPaymentItem[] = pendingData.map((data) => {
			const createdAt = new Date(data.payment.createdAt);
			const now = new Date();
			const daysPending = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

			return {
				id: data.payment.id,
				booking: {
					id: data.booking.id,
					bookingNumber: data.booking.bookingNumber,
					customerName: data.customer.name,
					startDate: data.booking.startDate,
				},
				amount: data.payment.amount,
				method: data.payment.method,
				createdAt: data.payment.createdAt,
				daysPending,
			};
		});

		return { items, total: items.length };
	}

	async getStats(): Promise<PaymentStats> {
		const stats = await this.paymentRepo.getStats();
		return {
			total: stats.total,
			byStatus: stats.byStatus as PaymentStats['byStatus'],
			byMethod: stats.byMethod as PaymentStats['byMethod'],
			totalAmount: stats.totalAmount,
		};
	}

	async getBookingPaymentSummaries() {
		return this.paymentRepo.getBookingPaymentSummaries();
	}
}
