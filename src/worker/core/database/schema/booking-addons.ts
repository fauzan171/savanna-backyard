import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { bookings } from './bookings';

// Booking add-ons table
export const bookingAddons = sqliteTable('booking_addons', {
	id: text('id').primaryKey(),
	bookingId: text('booking_id').notNull().references(() => bookings.id),
	type: text('type', { enum: ['TourGuide', 'SafetyGear', 'PickupDropoff', 'Package', 'Other'] }).notNull(),
	description: text('description'),
	amount: real('amount').notNull(),
	isMandatory: integer('is_mandatory', { mode: 'boolean' }).default(false),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Type exports
export type BookingAddon = typeof bookingAddons.$inferSelect;
export type NewBookingAddon = typeof bookingAddons.$inferInsert;
