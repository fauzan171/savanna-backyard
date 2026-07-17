CREATE TABLE `vehicle_conditions` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`checklist_id` text,
	`condition_status` text NOT NULL,
	`notes` text,
	`km` real,
	`checked_at` text NOT NULL,
	`checked_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `vehicle_conditions_vehicle_idx` ON `vehicle_conditions` (`vehicle_id`);--> statement-breakpoint
CREATE INDEX `vehicle_conditions_checked_at_idx` ON `vehicle_conditions` (`checked_at`);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `condition_status` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `last_km` real;--> statement-breakpoint
ALTER TABLE `bookings` ADD `return_confirmed` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `bookings` ADD `return_confirmed_at` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `damage_fee` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `bookings` ADD `total_penalty` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `bookings` ADD `penalty_paid` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `bookings` ADD `penalty_paid_at` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `pickup_checklist_id` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `return_checklist_id` text;