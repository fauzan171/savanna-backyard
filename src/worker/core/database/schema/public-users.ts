import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// Public (end-user) accounts — identified by phone number, verified via WhatsApp OTP.
// Login is phone-only (no Google/email). An account is find-or-created by phone on the
// first successful OTP verification. name/email are optional (filled in later, e.g. from
// the first booking or profile edit).
export const publicUsers = sqliteTable('public_users', {
	id: text('id').primaryKey(),
	phone: text('phone').notNull().unique(), // login identity (WhatsApp-verified)
	name: text('name'), // optional
	email: text('email'), // optional
	phoneVerified: integer('phone_verified', { mode: 'boolean' }).notNull().default(true),
	deviceFingerprint: text('device_fingerprint'), // anti-fraud (future), optional
	avatarUrl: text('avatar_url'),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	phoneIdx: index('public_users_phone_idx').on(table.phone),
}));

// Type exports
export type PublicUser = typeof publicUsers.$inferSelect;
export type NewPublicUser = typeof publicUsers.$inferInsert;
