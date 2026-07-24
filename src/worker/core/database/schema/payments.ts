import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { bookings } from './bookings';

// Payments table
export const payments = sqliteTable('payments', {
	id: text('id').primaryKey(),
	bookingId: text('booking_id').notNull().references(() => bookings.id),
	amount: real('amount').notNull(),
	currency: text('currency', { enum: ['IDR', 'USD'] }).notNull().default('IDR'),
	method: text('method', { enum: ['QRIS', 'Gateway', 'BankTransfer', 'Cash'] }).notNull(),
	status: text('status', { enum: ['Pending', 'Verified', 'Failed', 'Cancelled'] }).notNull().default('Pending'),
	transactionReference: text('transaction_reference'),
	verifiedBy: text('verified_by').references(() => users.id),
	verifiedAt: text('verified_at'),
	notes: text('notes'),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	bookingIdx: index('payments_booking_idx').on(table.bookingId),
	statusIdx: index('payments_status_idx').on(table.status),
	referenceIdx: index('payments_reference_idx').on(table.transactionReference),
}));

// Type exports
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
