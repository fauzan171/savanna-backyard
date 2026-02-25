-- Migration: Initial schema with users table
-- Created: 2025-02-25

CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'STAFF' NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS `users_email_idx` ON `users` (`email`);
