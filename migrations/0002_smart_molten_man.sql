-- Migration: Add remaining tables for vehicle rental system
-- Created: 2026-03-01

-- Customers table
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`address` text,
	`identity_type` text,
	`identity_number` text,
	`identity_photo_url` text,
	`notes` text,
	`is_blacklisted` integer DEFAULT false NOT NULL,
	`blacklist_reason` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint

-- Leads table
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`notes` text,
	`source` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`priority` text DEFAULT 'Warm' NOT NULL,
	`assigned_to` text,
	`follow_up_date` text,
	`converted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint

-- Vehicles table
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`plate_number` text NOT NULL,
	`type` text NOT NULL,
	`brand` text,
	`model` text,
	`year` integer,
	`daily_rate_idr` real NOT NULL,
	`daily_rate_usd` real,
	`status` text DEFAULT 'Available' NOT NULL,
	`total_km` real DEFAULT 0,
	`photo_url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_plate_number_unique` ON `vehicles` (`plate_number`);
--> statement-breakpoint
CREATE INDEX `vehicles_status_idx` ON `vehicles` (`status`);
--> statement-breakpoint
CREATE INDEX `vehicles_type_idx` ON `vehicles` (`type`);
--> statement-breakpoint
CREATE INDEX `vehicles_plate_idx` ON `vehicles` (`plate_number`);
--> statement-breakpoint

-- Vehicle status logs table
CREATE TABLE `vehicle_status_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`status_from` text NOT NULL,
	`status_to` text NOT NULL,
	`notes` text,
	`recorded_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint

-- Bookings table
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_number` text NOT NULL,
	`customer_id` text NOT NULL,
	`vehicle_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`actual_return_date` text,
	`start_km` real,
	`end_km` real,
	`status` text DEFAULT 'Pending' NOT NULL,
	`payment_terms` text NOT NULL,
	`base_amount` real NOT NULL,
	`addons_amount` real DEFAULT 0,
	`late_fee` real DEFAULT 0,
	`total_amount` real NOT NULL,
	`currency` text DEFAULT 'IDR' NOT NULL,
	`notes` text,
	`created_by` text,
	`cancelled_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_booking_number_unique` ON `bookings` (`booking_number`);
--> statement-breakpoint
CREATE INDEX `bookings_customer_idx` ON `bookings` (`customer_id`);
--> statement-breakpoint
CREATE INDEX `bookings_vehicle_idx` ON `bookings` (`vehicle_id`);
--> statement-breakpoint
CREATE INDEX `bookings_status_idx` ON `bookings` (`status`);
--> statement-breakpoint
CREATE INDEX `bookings_dates_idx` ON `bookings` (`start_date`,`end_date`);
--> statement-breakpoint
CREATE INDEX `bookings_number_idx` ON `bookings` (`booking_number`);
--> statement-breakpoint

-- Booking addons table
CREATE TABLE `booking_addons` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`amount` real NOT NULL,
	`is_mandatory` integer DEFAULT false,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint

-- Payments table
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'IDR' NOT NULL,
	`method` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`transaction_reference` text,
	`verified_by` text,
	`verified_at` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payments_booking_idx` ON `payments` (`booking_id`);
--> statement-breakpoint
CREATE INDEX `payments_status_idx` ON `payments` (`status`);
--> statement-breakpoint
CREATE INDEX `payments_reference_idx` ON `payments` (`transaction_reference`);
--> statement-breakpoint

-- Maintenance records table
CREATE TABLE `maintenance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`cost` real DEFAULT 0,
	`start_date` text NOT NULL,
	`end_date` text,
	`status` text DEFAULT 'Scheduled' NOT NULL,
	`booking_id` text,
	`photos` text,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `maintenance_vehicle_idx` ON `maintenance_records` (`vehicle_id`);
--> statement-breakpoint
CREATE INDEX `maintenance_status_idx` ON `maintenance_records` (`status`);
--> statement-breakpoint
CREATE INDEX `maintenance_booking_idx` ON `maintenance_records` (`booking_id`);
--> statement-breakpoint

-- System configuration table
CREATE TABLE `system_configuration` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updated_at` text NOT NULL,
	`updated_by` text,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `system_configuration_key_unique` ON `system_configuration` (`key`);
--> statement-breakpoint
CREATE INDEX `system_config_key_idx` ON `system_configuration` (`key`);
