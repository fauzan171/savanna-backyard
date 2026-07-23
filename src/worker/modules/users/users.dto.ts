import { z } from 'zod';
import { sanitizeText } from '@/worker/core/schemas/sanitize';

const nameField = z
	.string()
	.trim()
	.min(2)
	.max(100)
	.transform((v) => sanitizeText(v) as string);

// USER-03: password must be at least 8 chars AND contain upper, lower, and digit
const passwordField = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.refine((val) => /[a-z]/.test(val), 'Password must contain a lowercase letter')
	.refine((val) => /[A-Z]/.test(val), 'Password must contain an uppercase letter')
	.refine((val) => /[0-9]/.test(val), 'Password must contain a digit');

export const createUserSchema = z.object({
	name: nameField,
	email: z.string().trim().email(),
	password: passwordField,
	role: z.enum(['SUPER_ADMIN', 'STAFF']).optional().default('STAFF'),
	isActive: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
	name: nameField.optional(),
	email: z.string().trim().email().optional(),
	role: z.enum(['SUPER_ADMIN', 'STAFF']).optional(),
	isActive: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
	currentPassword: z.string().min(8),
	newPassword: passwordField,
});

export type CreateUserRequest = z.infer<typeof createUserSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
