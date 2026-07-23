import { z } from 'zod';
import { urlOrPath } from '@/worker/core/schemas/url';
import { sanitizeText } from '@/worker/core/schemas/sanitize';

// CUST-07 / FRM-05: trim + XSS sanitize free text; reject whitespace-only
const nameField = z
	.string()
	.trim()
	.min(2, 'Name must be at least 2 characters')
	.max(100)
	.transform((v) => sanitizeText(v) as string);

// Normalize phone: trim (no case folding — phone is not case-sensitive)
const phoneField = z.string().trim().min(5, 'Phone must be at least 5 characters').max(30);

// Create customer schema
export const createCustomerSchema = z.object({
	name: nameField,
	phone: phoneField,
	email: z.string().trim().email('Invalid email address').optional().nullable(),
	address: z
		.string()
		.max(500)
		.optional()
		.nullable()
		.transform((v) => (v == null ? v : (sanitizeText(v) as string))),
	identityType: z.enum(['KTP', 'SIM', 'Passport']).optional().nullable(),
	identityNumber: z.string().max(50).optional().nullable(),
	identityPhotoUrl: urlOrPath.optional().nullable(),
	notes: z
		.string()
		.max(2000)
		.optional()
		.nullable()
		.transform((v) => (v == null ? v : (sanitizeText(v) as string))),
});

// Update customer schema (all fields optional)
export const updateCustomerSchema = z.object({
	name: nameField.optional(),
	phone: phoneField.optional(),
	email: z.string().trim().email('Invalid email address').optional().nullable(),
	address: z
		.string()
		.max(500)
		.optional()
		.nullable()
		.transform((v) => (v == null ? v : (sanitizeText(v) as string))),
	identityType: z.enum(['KTP', 'SIM', 'Passport']).optional().nullable(),
	identityNumber: z.string().max(50).optional().nullable(),
	identityPhotoUrl: urlOrPath.optional().nullable(),
	notes: z
		.string()
		.max(2000)
		.optional()
		.nullable()
		.transform((v) => (v == null ? v : (sanitizeText(v) as string))),
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
