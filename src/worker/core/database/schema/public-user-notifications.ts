import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { publicUsers } from './public-users';

export const publicUserNotifications = sqliteTable('public_user_notifications', {
	id: text('id').primaryKey(),
	publicUserId: text('public_user_id').references(() => publicUsers.id),
	phone: text('phone'),
	type: text('type').notNull(),
	title: text('title').notNull(),
	message: text('message').notNull(),
	metadata: text('metadata'),
	readAt: text('read_at'),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
	publicUserIdx: index('public_user_notifications_public_user_idx').on(table.publicUserId),
	phoneIdx: index('public_user_notifications_phone_idx').on(table.phone),
	readIdx: index('public_user_notifications_read_idx').on(table.readAt),
	createdIdx: index('public_user_notifications_created_idx').on(table.createdAt),
}));

export type PublicUserNotification = typeof publicUserNotifications.$inferSelect;
export type NewPublicUserNotification = typeof publicUserNotifications.$inferInsert;
