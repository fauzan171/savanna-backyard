import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// Trails table
export const trails = sqliteTable('trails', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	terrain: text('terrain'),
	elevation: text('elevation'),
	difficulty: text('difficulty'),
	recommended: text('recommended'),
	image: text('image'),
	mapImage: text('map_image'),
	blogOverview: text('blog_overview'),
	blogTips: text('blog_tips'),
	blogGallery: text('blog_gallery'),
	gpxUrl: text('gpx_url'),
	estimatedDuration: text('estimated_duration'),
	distance: text('distance'),
	bestTime: text('best_time'),
	blogSubtitle: text('blog_subtitle'),
	blogStages: text('blog_stages'),
	blogChecklist: text('blog_checklist'),
	blogCulture: text('blog_culture'),
	blogWarning: text('blog_warning'),
	sortOrder: integer('sort_order').default(0),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	activeIdx: index('trails_active_idx').on(table.isActive),
}));

// Type exports
export type Trail = typeof trails.$inferSelect;
export type NewTrail = typeof trails.$inferInsert;
