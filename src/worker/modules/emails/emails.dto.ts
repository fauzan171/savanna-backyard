import { z } from 'zod';
import { sanitizeText } from '@/worker/core/schemas/sanitize';

// Send custom email schema. subject/message render into the email HTML body —
// a non-React surface — so sanitize to neutralize stored-XSS payloads.
export const sendEmailSchema = z.object({
	to: z.string().email('Invalid email address'),
	subject: z
		.string()
		.min(1, 'Subject is required')
		.max(200, 'Subject must be at most 200 characters')
		.transform((v) => sanitizeText(v) as string),
	message: z
		.string()
		.min(1, 'Message is required')
		.max(5000, 'Message must be at most 5000 characters')
		.transform((v) => sanitizeText(v) as string),
	bookingId: z.string().uuid('Invalid booking ID').optional().nullable(),
});

// Send payment reminder schema
export const sendReminderSchema = z.object({
	bookingId: z.string().uuid('Invalid booking ID'),
	pickupTime: z.string().min(1, 'Pickup time is required').optional(),
	pickupLocation: z
		.string()
		.min(1, 'Pickup location is required')
		.optional()
		.transform((v) => (v == null ? v : (sanitizeText(v) as string))),
});

// Types
export type SendEmailRequest = z.infer<typeof sendEmailSchema>;
export type SendReminderRequest = z.infer<typeof sendReminderSchema>;
