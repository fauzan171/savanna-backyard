import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';

// Rentable equipment (helmets, jerseys, boots, etc.) added to a booking.
// Priced per day for the same duration as the vehicle. Stock is informational
// for now (no availability check in the foundation slice).
export const equipment = sqliteTable('equipment', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	category: text('category', { enum: ['Safety', 'Apparel', 'Accessories', 'Electronics'] }).notNull(),
	description: text('description'),
	dailyRateIdr: real('daily_rate_idr').notNull(),
	image: text('image'),
	stock: integer('stock').notNull().default(0),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	minRentalDays: integer('min_rental_days').notNull().default(1),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	categoryIdx: index('equipment_category_idx').on(table.category),
	activeIdx: index('equipment_active_idx').on(table.isActive),
}));

// Type exports
export type Equipment = typeof equipment.$inferSelect;
export type NewEquipment = typeof equipment.$inferInsert;
