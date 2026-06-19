import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { users } from './users';

// Leads table
export const leads = sqliteTable('leads', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	phone: text('phone').notNull(),
	email: text('email'),
	notes: text('notes'),
	source: text('source', { enum: ['WhatsApp', 'Instagram', 'Facebook', 'TikTok', 'Website', 'WalkIn'] }).notNull(),
	status: text('status', { enum: ['New', 'Contacted', 'Negotiating', 'Converted', 'Lost'] }).notNull().default('New'),
	priority: text('priority', { enum: ['Hot', 'Warm', 'Cold'] }).notNull().default('Warm'),
	assignedTo: text('assigned_to').references(() => users.id),
	followUpDate: text('follow_up_date'),
	convertedAt: text('converted_at'),
	preferredStart: text('preferred_start'),
	preferredEnd: text('preferred_end'),
	vehicleInterest: text('vehicle_interest'),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	statusIdx: index('leads_status_idx').on(table.status),
	sourceIdx: index('leads_source_idx').on(table.source),
	assignedIdx: index('leads_assigned_idx').on(table.assignedTo),
	followUpIdx: index('leads_followup_idx').on(table.followUpDate),
}));

// Type exports
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
