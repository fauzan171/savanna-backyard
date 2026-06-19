import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// Reviews table
export const reviews = sqliteTable('reviews', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	location: text('location'),
	rating: integer('rating').notNull(),
	text: text('text').notNull(),
	avatar: text('avatar'),
	isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	publishedIdx: index('reviews_published_idx').on(table.isPublished),
	ratingIdx: index('reviews_rating_idx').on(table.rating),
}));

// Type exports
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
