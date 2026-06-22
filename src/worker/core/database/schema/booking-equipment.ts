import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';
import { bookings } from './bookings';
import { equipment } from './equipment';

// Junction: equipment line items attached to a booking.
// unitPrice is the equipment dailyRateIdr snapshotted at booking time (price changes
// later don't retroactively affect existing bookings); totalPrice = unitPrice * quantity * days.
export const bookingEquipment = sqliteTable('booking_equipment', {
	id: text('id').primaryKey(),
	bookingId: text('booking_id').notNull().references(() => bookings.id),
	equipmentId: text('equipment_id').notNull().references(() => equipment.id),
	quantity: integer('quantity').notNull(),
	unitPrice: real('unit_price').notNull(),
	totalPrice: real('total_price').notNull(),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	bookingIdx: index('booking_equipment_booking_idx').on(table.bookingId),
	equipmentIdx: index('booking_equipment_equipment_idx').on(table.equipmentId),
}));

// Type exports
export type BookingEquipment = typeof bookingEquipment.$inferSelect;
export type NewBookingEquipment = typeof bookingEquipment.$inferInsert;
