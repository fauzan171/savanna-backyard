import { z } from 'zod';

// Create payment schema
export const createPaymentSchema = z.object({
	bookingId: z.string().uuid(),
	amount: z.number().min(0.01, 'Amount must be greater than 0'),
	currency: z.enum(['IDR', 'USD']).default('IDR'),
	method: z.enum(['QRIS', 'Gateway', 'BankTransfer', 'Cash']),
	transactionReference: z.string().max(200).optional().nullable(),
	notes: z.string().max(1000).optional().nullable(),
});

// Verify payment schema
export const verifyPaymentSchema = z.object({
	notes: z.string().max(500).optional().nullable(),
});

// Reject payment schema
export const rejectPaymentSchema = z.object({
	reason: z.string().min(1, 'Reason is required').max(500),
});

// List payments query schema
export const listPaymentsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(25),
	bookingId: z.string().uuid().optional(),
	status: z.enum(['Pending', 'Verified', 'Failed']).optional(),
	method: z.enum(['QRIS', 'Gateway', 'BankTransfer', 'Cash']).optional(),
	dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Types
export type CreatePaymentRequest = z.infer<typeof createPaymentSchema>;
export type VerifyPaymentRequest = z.infer<typeof verifyPaymentSchema>;
export type RejectPaymentRequest = z.infer<typeof rejectPaymentSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
