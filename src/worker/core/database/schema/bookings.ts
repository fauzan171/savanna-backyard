import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { customers } from './customers';
import { vehicles } from './vehicles';
import { publicUsers } from './public-users';

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
	reminderDaySentAt: text('reminder_day_sent_at'),
	reminderHourSentAt: text('reminder_hour_sent_at'),
	followupSentAt: text('followup_sent_at'),
	reviewRequestSentAt: text('review_request_sent_at'),
	// Public-user account linking (nullable: old guest bookings have no account)
	publicUserId: text('public_user_id').references(() => publicUsers.id),
	// Equipment rental total (Σ equipment dailyRate × qty × days)
	equipmentTotalAmount: real('equipment_total_amount').default(0),
	// DP / partial payment (single Xendit invoice with allow_partial)
	paymentType: text('payment_type', { enum: ['full', 'dp'] }).default('full'),
	xenditInvoiceId: text('xendit_invoice_id'),
	dpAmount: real('dp_amount').default(0),
	dpPaidAt: text('dp_paid_at'),
	remainingAmount: real('remaining_amount').default(0),
	fullyPaidAt: text('fully_paid_at'),
	// QR pickup confirmation (user scans bike QR on pickup day)
	pickupConfirmed: integer('pickup_confirmed', { mode: 'boolean' }).default(false),
	pickupConfirmedAt: text('pickup_confirmed_at'),
	// Return confirmation + penalties (damage detection vs pickup checklist)
	returnConfirmed: integer('return_confirmed', { mode: 'boolean' }).default(false),
	returnConfirmedAt: text('return_confirmed_at'),
	damageFee: real('damage_fee').default(0),
	totalPenalty: real('total_penalty').default(0),
	penaltyPaid: integer('penalty_paid', { mode: 'boolean' }).default(false),
	penaltyPaidAt: text('penalty_paid_at'),
	// Soft refs to vehicle_checklists (no FK to avoid circular friction in SQLite)
	pickupChecklistId: text('pickup_checklist_id'),
	returnChecklistId: text('return_checklist_id'),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	customerIdx: index('bookings_customer_idx').on(table.customerId),
	vehicleIdx: index('bookings_vehicle_idx').on(table.vehicleId),
	statusIdx: index('bookings_status_idx').on(table.status),
	datesIdx: index('bookings_dates_idx').on(table.startDate, table.endDate),
	numberIdx: index('bookings_number_idx').on(table.bookingNumber),
	publicUserIdx: index('bookings_public_user_idx').on(table.publicUserId),
}));

// Type exports
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
