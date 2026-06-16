import { z } from 'zod';

// Send custom email schema
export const sendEmailSchema = z.object({
	to: z.string().email('Invalid email address'),
	subject: z.string().min(1, 'Subject is required').max(200, 'Subject must be at most 200 characters'),
	message: z.string().min(1, 'Message is required').max(5000, 'Message must be at most 5000 characters'),
	bookingId: z.string().uuid('Invalid booking ID').optional().nullable(),
});

// Send payment reminder schema
export const sendReminderSchema = z.object({
	bookingId: z.string().uuid('Invalid booking ID'),
	pickupTime: z.string().min(1, 'Pickup time is required').optional(),
	pickupLocation: z.string().min(1, 'Pickup location is required').optional(),
});

// Types
export type SendEmailRequest = z.infer<typeof sendEmailSchema>;
export type SendReminderRequest = z.infer<typeof sendReminderSchema>;
