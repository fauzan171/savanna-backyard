import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { vehicles } from './vehicles';

// Vehicle condition history — one row per inspection (pickup/return checklist or manual).
export const vehicleConditions = sqliteTable('vehicle_conditions', {
	id: text('id').primaryKey(),
	vehicleId: text('vehicle_id').notNull().references(() => vehicles.id),
	// Soft ref to vehicle_checklists (nullable: allows manual condition entries)
	checklistId: text('checklist_id'),
	conditionStatus: text('condition_status', {
		enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Maintenance'],
	}).notNull(),
	notes: text('notes'),
	km: real('km'),
	checkedAt: text('checked_at').notNull(),
	checkedBy: text('checked_by'),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	vehicleIdx: index('vehicle_conditions_vehicle_idx').on(table.vehicleId),
	checkedAtIdx: index('vehicle_conditions_checked_at_idx').on(table.checkedAt),
}));

// Type exports
export type VehicleCondition = typeof vehicleConditions.$inferSelect;
export type NewVehicleCondition = typeof vehicleConditions.$inferInsert;
