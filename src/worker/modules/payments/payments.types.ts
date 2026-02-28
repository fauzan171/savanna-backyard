import type { Payment, Booking } from '@/worker/core/database/schema';

// Status types
export type PaymentStatus = Payment['status'];
export type PaymentMethod = Payment['method'];
export type PaymentCurrency = Payment['currency'];

// Response types
export interface BookingSummary {
	id: string;
	bookingNumber: string;
	customerName: string;
}

export interface BookingSummaryWithDetails extends BookingSummary {
	customer: {
		id: string;
		name: string;
		phone: string;
	};
	vehicle: {
		id: string;
		name: string;
	};
	totalAmount: number;
	status: Booking['status'];
}

export interface PaymentResponse {
	id: string;
	booking: BookingSummary;
	amount: number;
	currency: PaymentCurrency;
	method: PaymentMethod;
	status: PaymentStatus;
	transactionReference: string | null;
	verifiedBy: {
		id: string;
		name: string;
	} | null;
	verifiedAt: string | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface PaymentWithDetails extends PaymentResponse {
	booking: BookingSummaryWithDetails;
	gatewayResponse: {
		paymentUrl: string | null;
		paidAt: string | null;
	} | null;
}

export interface VerifyPaymentResult {
	id: string;
	status: PaymentStatus;
	verifiedBy: {
		id: string;
		name: string;
	};
	verifiedAt: string;
	bookingStatus: Booking['status'];
	paymentSummary: {
		totalPaid: number;
		remaining: number;
		isFullyPaid: boolean;
	};
}

export interface PaymentSummary {
	bookingId: string;
	bookingNumber: string;
	totalAmount: number;
	currency: PaymentCurrency;
	paymentTerms: Booking['paymentTerms'];
	payments: {
		id: string;
		amount: number;
		method: PaymentMethod;
		status: PaymentStatus;
		createdAt: string;
	}[];
	summary: {
		totalPaid: number;
		pendingAmount: number;
		remaining: number;
		isFullyPaid: boolean;
		paymentProgress: number;
	};
}

export interface PendingPaymentItem {
	id: string;
	booking: {
		id: string;
		bookingNumber: string;
		customerName: string;
		startDate: string;
	};
	amount: number;
	method: PaymentMethod;
	createdAt: string;
	daysPending: number;
}

export interface PaymentStats {
	total: number;
	byStatus: Record<PaymentStatus, number>;
	byMethod: Record<PaymentMethod, number>;
	totalAmount: number;
}
