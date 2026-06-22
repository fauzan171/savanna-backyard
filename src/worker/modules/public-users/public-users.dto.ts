import { z } from 'zod';

// Google OAuth login (id_token from Google Sign-In on the landing page)
export const googleLoginSchema = z.object({
	idToken: z.string().min(1, 'Google id_token is required'),
	deviceFingerprint: z.string().optional(),
});
export type GoogleLoginRequest = z.infer<typeof googleLoginSchema>;

// Start WhatsApp phone verification (cookie-authenticated public user)
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
