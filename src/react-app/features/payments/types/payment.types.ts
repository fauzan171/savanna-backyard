import type { BaseEntity, UserReference } from '@/react-app/features/shared/types/api.types';
import { z } from 'zod';

// ============================================
// PAYMENT STATUS & ENUMS
// ============================================

export type PaymentStatus = 'Pending' | 'Verified' | 'Failed';
export type PaymentMethod = 'QRIS' | 'Gateway' | 'Bank_Transfer' | 'Cash';
export type Currency = 'IDR' | 'USD';

// ============================================
// PAYMENT ENTITY TYPES
// ============================================

/** Basic payment entity */
export interface Payment extends BaseEntity {
	bookingId: string;
	booking: {
		id: string;
		bookingNumber: string;
		customer: {
			id: string;
			name: string;
			phone: string;
		};
		vehicle: {
			id: string;
			name: string;
			plateNumber: string;
		};
		totalAmount: number;
		currency: Currency;
	};
	amount: number;
	currency: Currency;
	method: PaymentMethod;
	status: PaymentStatus;
	transactionReference: string | null;
	proofUrl: string | null;
	notes: string | null;
	verifiedBy: UserReference | null;
	verifiedAt: string | null;
	rejectionReason: string | null;
}

/** Payment with booking details */
export interface PaymentWithDetails extends Payment {
	// Additional details if needed
}

// ============================================
// API REQUEST TYPES
// ============================================

export interface CreatePaymentRequest {
	bookingId: string;
	amount: number;
	currency?: Currency;
	method: PaymentMethod;
	transactionReference?: string;
	proofUrl?: string;
	notes?: string;
}

export interface VerifyPaymentRequest {
	verified: boolean;
	rejectionReason?: string;
}

export interface UpdatePaymentRequest {
	transactionReference?: string;
	proofUrl?: string;
	notes?: string;
}

// ============================================
// LIST FILTERS
// ============================================

export interface PaymentFilters {
	status?: PaymentStatus;
	method?: PaymentMethod;
	bookingId?: string;
	dateFrom?: string;
	dateTo?: string;
	search?: string;
}

// ============================================
// FORM TYPES
// ============================================

export type PaymentFormData = Omit<CreatePaymentRequest, 'bookingId'> & {
	bookingId: string;
};

// ============================================
// ZOD SCHEMAS
// ============================================

export const paymentMethodSchema = z.enum(['QRIS', 'Gateway', 'Bank_Transfer', 'Cash']);
export const paymentStatusSchema = z.enum(['Pending', 'Verified', 'Failed']);
export const currencySchema = z.enum(['IDR', 'USD']);

export const createPaymentSchema = z.object({
	bookingId: z.string().min(1, 'Booking is required'),
	amount: z.number().positive('Amount must be positive'),
	currency: currencySchema.optional(),
	method: paymentMethodSchema,
	transactionReference: z.string().optional(),
	proofUrl: z.string().url().optional().or(z.literal('')),
	notes: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
	verified: z.boolean(),
	rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters').optional(),
}).refine((data) => {
	if (!data.verified && !data.rejectionReason) {
		return false;
	}
	return true;
}, {
	message: 'Rejection reason is required when rejecting a payment',
	path: ['rejectionReason'],
});

export const paymentFormSchema = createPaymentSchema;

// ============================================
// HELPERS
// ============================================

export function getPaymentMethodLabel(method: PaymentMethod): string {
	return method.replace(/_/g, ' ');
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
	return status;
}
