import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Token blacklist table - stores revoked JWT tokens
export const tokenBlacklist = sqliteTable('token_blacklist', {
	id: text('id').primaryKey(),
	// JTI (JWT ID) - unique identifier for the token
	jti: text('jti').notNull().unique(),
	// User ID who owned the token
	userId: text('user_id').notNull(),
	// Token hash (SHA-256 of token for security)
	tokenHash: text('token_hash').notNull(),
	// When the token expires (for cleanup)
	expiresAt: text('expires_at').notNull(),
	// When the token was blacklisted
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Type exports
export type TokenBlacklistEntry = typeof tokenBlacklist.$inferSelect;
export type NewTokenBlacklistEntry = typeof tokenBlacklist.$inferInsert;
