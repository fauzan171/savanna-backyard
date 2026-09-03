import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// Pricing tiers table
export const pricingTiers = sqliteTable('pricing_tiers', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	dailyPrice: integer('daily_price').notNull(),
	multiDayPrice: integer('multi_day_price').notNull(),
	// LC-006: optional USD prices (mirrors vehicles.daily_rate_usd). When null,
	// public EN display converts IDR via the `usd_rate` system config.
	dailyPriceUsd: integer('daily_price_usd'),
	multiDayPriceUsd: integer('multi_day_price_usd'),
	features: text('features').notNull(),
	notIncluded: text('not_included').notNull(),
	highlighted: integer('highlighted', { mode: 'boolean' }).notNull().default(false),
	icon: text('icon'),
	sortOrder: integer('sort_order').default(0),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	activeIdx: index('pricing_tiers_active_idx').on(table.isActive),
}));

// Type exports
export type PricingTier = typeof pricingTiers.$inferSelect;
export type NewPricingTier = typeof pricingTiers.$inferInsert;
