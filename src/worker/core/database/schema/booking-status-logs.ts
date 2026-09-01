import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

/**
 * Tracks every booking status change for the History tab.
 * One row per transition (e.g. Pending → Confirmed, Confirmed → Active, etc.)
 */
export const bookingStatusLogs = sqliteTable(
	'booking_status_logs',
	{
		id: text('id').primaryKey(),
		bookingId: text('booking_id').notNull(),
		fromStatus: text('from_status'),
		toStatus: text('to_status').notNull(),
		changedBy: text('changed_by'),
		note: text('note'),
		createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	},
	(table) => ({
		bookingIdx: index('booking_status_logs_booking_idx').on(table.bookingId),
		createdAtIdx: index('booking_status_logs_created_idx').on(table.createdAt),
	}),
);

export type BookingStatusLog = typeof bookingStatusLogs.$inferSelect;
