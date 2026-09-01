import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { publicUsers } from './public-users';

// OTP / phone-verification codes for the inbound WhatsApp OTP flow:
//   1. user requests OTP  -> row created with ref_code (short, human-typable)
//   2. user sends the ref_code to the WA business number
//   3. inbound WA webhook parses the ref_code, generates a 6-digit OTP, stores its hash here,
//      and replies the OTP via WhatsApp
//   4. user submits the OTP to /phone/verify -> matched against otp_hash, row consumed.
export const verificationCodes = sqliteTable('verification_codes', {
	id: text('id').primaryKey(),
	publicUserId: text('public_user_id').references(() => publicUsers.id),
	phone: text('phone').notNull(), // number being verified
	refCode: text('ref_code').notNull(), // e.g. "A3F9" — user types this into WhatsApp
	otpCode: text('otp_code'), // temporary web-delivery audit value; null for WhatsApp-only hashed OTPs
	otpHash: text('otp_hash'), // SHA-256 hex of the 6-digit OTP (set when WA inbound arrives)
	deliveryChannel: text('delivery_channel', { enum: ['web', 'whatsapp'] }).notNull().default('whatsapp'),
	status: text('status', { enum: ['otp_sent', 'verified', 'expired'] }).notNull().default('otp_sent'),
	type: text('type', { enum: ['phone_otp'] }).notNull().default('phone_otp'),
	consumed: integer('consumed', { mode: 'boolean' }).notNull().default(false),
	attempts: integer('attempts').notNull().default(0), // wrong-OTP attempts on /verify
	expiresAt: text('expires_at').notNull(),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	refIdx: index('verification_codes_ref_idx').on(table.refCode),
	phoneIdx: index('verification_codes_phone_idx').on(table.phone),
}));

// Type exports
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type NewVerificationCode = typeof verificationCodes.$inferInsert;
