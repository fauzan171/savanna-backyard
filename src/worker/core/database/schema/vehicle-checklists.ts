import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { vehicles } from './vehicles';
import { bookings } from './bookings';

// Vehicle condition checklists table
export const vehicleChecklists = sqliteTable('vehicle_checklists', {
	id: text('id').primaryKey(),
	bookingId: text('booking_id').notNull().references(() => bookings.id),
	vehicleId: text('vehicle_id').notNull().references(() => vehicles.id),
	type: text('type', { enum: ['pickup', 'return'] }).notNull(),
	items: text('items').notNull(), // JSON: { "body_no_scratches": true, ... }
	kmReading: real('km_reading').notNull(),
	fuelLevel: integer('fuel_level'), // 0-100 percent
	photos: text('photos'), // JSON array of photo URLs
	notes: text('notes'),
	damageNotes: text('damage_notes'), // khusus return, wajib jika ada damage
	createdBy: text('created_by').notNull().references(() => users.id),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	bookingIdx: index('vehicle_checklists_booking_idx').on(table.bookingId),
	vehicleIdx: index('vehicle_checklists_vehicle_idx').on(table.vehicleId),
	typeIdx: index('vehicle_checklists_type_idx').on(table.type),
}));

// Type exports
export type VehicleChecklist = typeof vehicleChecklists.$inferSelect;
export type NewVehicleChecklist = typeof vehicleChecklists.$inferInsert;
