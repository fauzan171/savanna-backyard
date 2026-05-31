import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

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
});

// Type exports
export type Package = typeof packages.$inferSelect;
export type NewPackage = typeof packages.$inferInsert;
