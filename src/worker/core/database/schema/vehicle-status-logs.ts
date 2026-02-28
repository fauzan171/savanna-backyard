import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { vehicles } from './vehicles';

// Vehicle status logs table
export const vehicleStatusLogs = sqliteTable('vehicle_status_logs', {
	id: text('id').primaryKey(),
	vehicleId: text('vehicle_id').notNull().references(() => vehicles.id),
	statusFrom: text('status_from').notNull(),
	statusTo: text('status_to').notNull(),
	notes: text('notes'),
	recordedBy: text('recorded_by').references(() => users.id),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Type exports
export type VehicleStatusLog = typeof vehicleStatusLogs.$inferSelect;
export type NewVehicleStatusLog = typeof vehicleStatusLogs.$inferInsert;
