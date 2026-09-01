import { z } from 'zod';

// Start WhatsApp phone login (no auth — this IS the login entry point)
export const phoneInitSchema = z.object({
	phone: z.string().min(8, 'Nomor WhatsApp wajib diisi').max(30),
});
export type PhoneInitRequest = z.infer<typeof phoneInitSchema>;

// Verify the WhatsApp OTP
export const phoneVerifySchema = z.object({
	phone: z.string().min(8, 'Nomor WhatsApp wajib diisi').max(30),
	code: z.string().regex(/^\d{6}$/, 'OTP harus 6 digit'),
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

export const customerInspectionSchema = z.object({
	qrCode: z.string().min(1, 'QR code is required'),
	phase: z.enum(['pickup', 'return']),
	items: z.record(z.enum(['ok', 'issue'])).refine((items) => Object.keys(items).length > 0, 'Checklist is required'),
	kmReading: z.number().min(0),
	fuelLevel: z.number().int().min(0).max(100).optional().nullable(),
	photos: z.array(z.string().min(1)).min(1, 'At least one vehicle photo is required').max(6),
	notes: z.string().max(2000).optional().nullable(),
});
export type CustomerInspectionRequest = z.infer<typeof customerInspectionSchema>;
