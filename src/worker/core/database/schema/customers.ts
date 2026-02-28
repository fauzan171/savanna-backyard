import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Customers table
export const customers = sqliteTable('customers', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	phone: text('phone').notNull(),
	email: text('email'),
	address: text('address'),
	identityType: text('identity_type', { enum: ['KTP', 'SIM', 'Passport'] }),
	identityNumber: text('identity_number'),
	identityPhotoUrl: text('identity_photo_url'),
	notes: text('notes'),
	isBlacklisted: integer('is_blacklisted', { mode: 'boolean' }).notNull().default(false),
	blacklistReason: text('blacklist_reason'),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Type exports
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
