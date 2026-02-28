import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { users } from './users';

// System configuration table
export const systemConfiguration = sqliteTable('system_configuration', {
	id: text('id').primaryKey(),
	key: text('key').notNull().unique(),
	value: text('value').notNull(),
	description: text('description'),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedBy: text('updated_by').references(() => users.id),
}, (table) => ({
	keyIdx: index('system_config_key_idx').on(table.key),
}));

// Type exports
export type SystemConfiguration = typeof systemConfiguration.$inferSelect;
export type NewSystemConfiguration = typeof systemConfiguration.$inferInsert;
