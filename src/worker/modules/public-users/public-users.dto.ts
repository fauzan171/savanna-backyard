import { z } from 'zod';

// Start WhatsApp phone login (no auth — this IS the login entry point)
export const phoneInitSchema = z.object({
	phone: z.string().regex(/^\d{8,15}$/, 'Phone must be 8-15 digits (no spaces)'),
});
export type PhoneInitRequest = z.infer<typeof phoneInitSchema>;

// Verify the WhatsApp OTP
export const phoneVerifySchema = z.object({
	phone: z.string().regex(/^\d{8,15}$/, 'Phone must be 8-15 digits'),
	code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});
export type PhoneVerifyRequest = z.infer<typeof phoneVerifySchema>;

// Update profile
export const updateProfileSchema = z.object({
	name: z.string().min(2, 'Name too short').optional(),
	avatarUrl: z.string().url().nullable().optional(),
});
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;

// Developer email login — gated by DEVELOPER_ALLOWLIST env, no OTP. For internal/dev access only.
export const devLoginSchema = z.object({
	email: z.string().email('Valid email is required'),
});
export type DevLoginRequest = z.infer<typeof devLoginSchema>;

// Confirm pickup by scanning the vehicle QR code (customer-side)
export const confirmPickupSchema = z.object({
	qrCode: z.string().min(1, 'QR code is required'),
});
export type ConfirmPickupRequest = z.infer<typeof confirmPickupSchema>;
