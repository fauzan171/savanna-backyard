import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { vehicles } from './vehicles';
import { bookings } from './bookings';

// Maintenance records table
export const maintenanceRecords = sqliteTable('maintenance_records', {
	id: text('id').primaryKey(),
	vehicleId: text('vehicle_id').notNull().references(() => vehicles.id),
	type: text('type', { enum: ['Scheduled', 'Repair', 'Damage'] }).notNull(),
	description: text('description').notNull(),
	cost: real('cost').default(0),
	startDate: text('start_date').notNull(),
	endDate: text('end_date'),
	status: text('status', { enum: ['Scheduled', 'InProgress', 'Completed'] }).notNull().default('Scheduled'),
	bookingId: text('booking_id').references(() => bookings.id),
	createdBy: text('created_by').references(() => users.id),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	vehicleIdx: index('maintenance_vehicle_idx').on(table.vehicleId),
	statusIdx: index('maintenance_status_idx').on(table.status),
	bookingIdx: index('maintenance_booking_idx').on(table.bookingId),
}));

// Type exports
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type NewMaintenanceRecord = typeof maintenanceRecords.$inferInsert;
