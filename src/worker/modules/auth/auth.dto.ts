import { z } from 'zod';

// Login request schema
export const loginSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Login response
export const loginResponseSchema = z.object({
	data: z.object({
		id: z.string(),
		name: z.string(),
		email: z.string(),
		role: z.enum(['SUPER_ADMIN', 'STAFF']),
	}),
});

// User response
export const userResponseSchema = z.object({
	data: z.object({
		id: z.string(),
		name: z.string(),
		email: z.string(),
		role: z.enum(['SUPER_ADMIN', 'STAFF']),
	}),
});

// Types
export type LoginRequest = z.infer<typeof loginSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>['data'];
export type UserResponse = z.infer<typeof userResponseSchema>['data'];
