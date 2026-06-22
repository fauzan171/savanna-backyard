import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// Public (end-user) accounts — Google OAuth login + WhatsApp-verified phone.
// Created on Google login; `phone` is set (and `phone_verified` flipped) after the
// inbound WhatsApp OTP flow. Guests browsing the landing page never touch this table.
export const publicUsers = sqliteTable('public_users', {
	id: text('id').primaryKey(),
	googleId: text('google_id').notNull().unique(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	phone: text('phone').unique(), // null until WhatsApp OTP verification (SQLite allows multiple NULLs)
	phoneVerified: integer('phone_verified', { mode: 'boolean' }).notNull().default(false),
	deviceFingerprint: text('device_fingerprint'), // anti-fraud (Phase 6), optional
	avatarUrl: text('avatar_url'),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	phoneIdx: index('public_users_phone_idx').on(table.phone),
	emailIdx: index('public_users_email_idx').on(table.email),
}));

// Type exports
export type PublicUser = typeof publicUsers.$inferSelect;
export type NewPublicUser = typeof publicUsers.$inferInsert;
