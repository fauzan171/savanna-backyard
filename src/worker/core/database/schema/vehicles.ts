import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

// Vehicles table
export const vehicles = sqliteTable('vehicles', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	plateNumber: text('plate_number').notNull().unique(),
	type: text('type', { enum: ['TrailBike', 'StreetBike', 'Car', 'Jeep', 'Other'] }).notNull(),
	brand: text('brand'),
	model: text('model'),
	year: integer('year'),
	dailyRateIdr: real('daily_rate_idr').notNull(),
	dailyRateUsd: real('daily_rate_usd'),
	status: text('status', { enum: ['Available', 'Rented', 'Maintenance', 'Inactive'] }).notNull().default('Available'),
	totalKm: real('total_km').default(0),
	photoUrl: text('photo_url'),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	statusIdx: index('vehicles_status_idx').on(table.status),
	typeIdx: index('vehicles_type_idx').on(table.type),
	plateIdx: index('vehicles_plate_idx').on(table.plateNumber),
}));

// Type exports
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
