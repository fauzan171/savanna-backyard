CREATE TABLE `vehicle_checklists` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`vehicle_id` text NOT NULL,
	`type` text NOT NULL,
	`items` text NOT NULL,
	`km_reading` real NOT NULL,
	`fuel_level` integer,
	`photos` text,
	`notes` text,
	`damage_notes` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `vehicle_checklists_booking_idx` ON `vehicle_checklists` (`booking_id`);--> statement-breakpoint
CREATE INDEX `vehicle_checklists_vehicle_idx` ON `vehicle_checklists` (`vehicle_id`);--> statement-breakpoint
CREATE INDEX `vehicle_checklists_type_idx` ON `vehicle_checklists` (`type`);