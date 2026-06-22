CREATE TABLE `public_users` (
	`id` text PRIMARY KEY NOT NULL,
	`google_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`phone_verified` integer DEFAULT false NOT NULL,
	`device_fingerprint` text,
	`avatar_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `public_users_google_id_unique` ON `public_users` (`google_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `public_users_email_unique` ON `public_users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `public_users_phone_unique` ON `public_users` (`phone`);--> statement-breakpoint
CREATE INDEX `public_users_phone_idx` ON `public_users` (`phone`);--> statement-breakpoint
CREATE INDEX `public_users_email_idx` ON `public_users` (`email`);--> statement-breakpoint
CREATE TABLE `verification_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`public_user_id` text,
	`phone` text NOT NULL,
	`ref_code` text NOT NULL,
	`otp_hash` text,
	`type` text DEFAULT 'phone_otp' NOT NULL,
	`consumed` integer DEFAULT false NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`public_user_id`) REFERENCES `public_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `verification_codes_ref_idx` ON `verification_codes` (`ref_code`);--> statement-breakpoint
CREATE INDEX `verification_codes_phone_idx` ON `verification_codes` (`phone`);--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`daily_rate_idr` real NOT NULL,
	`image` text,
	`stock` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`min_rental_days` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `equipment_category_idx` ON `equipment` (`category`);--> statement-breakpoint
CREATE INDEX `equipment_active_idx` ON `equipment` (`is_active`);--> statement-breakpoint
CREATE TABLE `booking_equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` real NOT NULL,
	`total_price` real NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `booking_equipment_booking_idx` ON `booking_equipment` (`booking_id`);--> statement-breakpoint
CREATE INDEX `booking_equipment_equipment_idx` ON `booking_equipment` (`equipment_id`);--> statement-breakpoint
ALTER TABLE `bookings` ADD `public_user_id` text REFERENCES public_users(id);--> statement-breakpoint
ALTER TABLE `bookings` ADD `equipment_total_amount` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `bookings` ADD `payment_type` text DEFAULT 'full';--> statement-breakpoint
ALTER TABLE `bookings` ADD `xendit_invoice_id` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `dp_amount` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `bookings` ADD `dp_paid_at` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `remaining_amount` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `bookings` ADD `fully_paid_at` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `pickup_confirmed` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `bookings` ADD `pickup_confirmed_at` text;--> statement-breakpoint
CREATE INDEX `bookings_public_user_idx` ON `bookings` (`public_user_id`);