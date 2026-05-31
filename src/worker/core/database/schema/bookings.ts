import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { customers } from './customers';
import { vehicles } from './vehicles';

// Bookings table
export const bookings = sqliteTable('bookings', {
	id: text('id').primaryKey(),
	bookingNumber: text('booking_number').notNull().unique(),
	customerId: text('customer_id').notNull().references(() => customers.id),
	vehicleId: text('vehicle_id').notNull().references(() => vehicles.id),
	startDate: text('start_date').notNull(),
	endDate: text('end_date').notNull(),
	actualReturnDate: text('actual_return_date'),
	startKm: real('start_km'),
	endKm: real('end_km'),
	status: text('status', {
		enum: ['Pending', 'pending_payment', 'Confirmed', 'Active', 'Completed', 'Cancelled', 'payment_failed', 'expired', 'refunded']
	}).notNull().default('Pending'),
	paymentTerms: text('payment_terms', { enum: ['DP_Pickup', 'Full_Upfront', 'DP_After', 'Flexible'] }).notNull(),
	paymentStatus: text('payment_status'),
	paymentMethod: text('payment_method'),
	snapToken: text('snap_token'),
	paymentPageUrl: text('payment_page_url'),
	paidAt: text('paid_at'),
	baseAmount: real('base_amount').notNull(),
	addonsAmount: real('addons_amount').default(0),
	lateFee: real('late_fee').default(0),
	totalAmount: real('total_amount').notNull(),
	currency: text('currency', { enum: ['IDR', 'USD'] }).notNull().default('IDR'),
	notes: text('notes'),
	createdBy: text('created_by').references(() => users.id),
	cancelledAt: text('cancelled_at'),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	customerIdx: index('bookings_customer_idx').on(table.customerId),
	vehicleIdx: index('bookings_vehicle_idx').on(table.vehicleId),
	statusIdx: index('bookings_status_idx').on(table.status),
	datesIdx: index('bookings_dates_idx').on(table.startDate, table.endDate),
	numberIdx: index('bookings_number_idx').on(table.bookingNumber),
}));

// Type exports
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
