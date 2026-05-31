import { z } from 'zod';

export const createUserSchema = z.object({
	name: z.string().min(2),
	email: z.string().email(),
	password: z.string().min(8),
	role: z.enum(['SUPER_ADMIN', 'STAFF']).optional().default('STAFF'),
	isActive: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
	name: z.string().min(2).optional(),
	email: z.string().email().optional(),
	role: z.enum(['SUPER_ADMIN', 'STAFF']).optional(),
	isActive: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
	currentPassword: z.string().min(8),
	newPassword: z.string().min(8),
});

export type CreateUserRequest = z.infer<typeof createUserSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
