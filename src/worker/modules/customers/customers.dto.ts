import { z } from 'zod';
import { urlOrPath } from '@/worker/core/schemas/url';
import { sanitizeText } from '@/worker/core/lib/sanitize';

// Create customer schema
export const createCustomerSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters').max(100).transform(sanitizeText),
	phone: z.string().min(5, 'Phone must be at least 5 characters').regex(/^[0-9+\-\s]+$/, 'Phone must contain only digits, +, spaces or dashes'),
	email: z.string().email('Invalid email address').optional().nullable(),
	address: z.string().max(500).optional().nullable(),
	identityType: z.enum(['KTP', 'SIM', 'Passport']).optional().nullable(),
	identityNumber: z.string().max(50).optional().nullable(),
	identityPhotoUrl: urlOrPath.optional().nullable(),
	notes: z.string().max(2000).optional().nullable(),
});

// Update customer schema (all fields optional)
export const updateCustomerSchema = z.object({
	name: z.string().min(2).max(100).optional().transform((v) => (v == null ? v : sanitizeText(v))),
	phone: z.string().min(5).regex(/^[0-9+\-\s]+$/).optional(),
	email: z.string().email().optional().nullable(),
	address: z.string().max(500).optional().nullable(),
	identityType: z.enum(['KTP', 'SIM', 'Passport']).optional().nullable(),
	identityNumber: z.string().max(50).optional().nullable(),
	identityPhotoUrl: urlOrPath.optional().nullable(),
	notes: z.string().max(2000).optional().nullable(),
});

// Set blacklist schema
export const setBlacklistSchema = z.object({
	isBlacklisted: z.boolean(),
	reason: z.string().min(1, 'Reason is required when blacklisting').optional().nullable(),
}).refine(
	(data) => !data.isBlacklisted || (data.isBlacklisted && data.reason),
	{ message: 'Reason is required when blacklisting a customer' }
);

// List query schema
export const listCustomersQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(25),
	search: z.string().optional(),
	blacklist: z.coerce.boolean().optional(),
});

// Types
export type CreateCustomerRequest = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerRequest = z.infer<typeof updateCustomerSchema>;
export type SetBlacklistRequest = z.infer<typeof setBlacklistSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
