ALTER TABLE `verification_codes` ADD `otp_code` text;--> statement-breakpoint
ALTER TABLE `verification_codes` ADD `delivery_channel` text DEFAULT 'whatsapp' NOT NULL;--> statement-breakpoint
ALTER TABLE `verification_codes` ADD `status` text DEFAULT 'otp_sent' NOT NULL;--> statement-breakpoint

CREATE TABLE `public_user_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`public_user_id` text,
	`phone` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`metadata` text,
	`read_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`public_user_id`) REFERENCES `public_users`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint

CREATE INDEX `public_user_notifications_public_user_idx` ON `public_user_notifications` (`public_user_id`);--> statement-breakpoint
CREATE INDEX `public_user_notifications_phone_idx` ON `public_user_notifications` (`phone`);--> statement-breakpoint
CREATE INDEX `public_user_notifications_read_idx` ON `public_user_notifications` (`read_at`);--> statement-breakpoint
CREATE INDEX `public_user_notifications_created_idx` ON `public_user_notifications` (`created_at`);
