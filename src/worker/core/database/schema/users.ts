import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// Users table
export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	role: text('role', { enum: ['SUPER_ADMIN', 'STAFF'] }).notNull().default('STAFF'),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	roleIdx: index('users_role_idx').on(table.role),
	activeIdx: index('users_active_idx').on(table.isActive),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
