import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// Packages table (tour packages)
export const packages = sqliteTable('packages', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	tagline: text('tagline'),
	description: text('description'),
	image: text('image'),
	duration: text('duration'),
	distance: text('distance'),
	groupSize: text('group_size'),
	price: integer('price').notNull(),
	trailId: text('trail_id'),
	sortOrder: integer('sort_order').default(0),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	activeIdx: index('packages_active_idx').on(table.isActive),
	trailIdx: index('packages_trail_idx').on(table.trailId),
}));

// Type exports
export type Package = typeof packages.$inferSelect;
export type NewPackage = typeof packages.$inferInsert;
