PRAGMA foreign_keys=OFF;
ALTER TABLE `bookings` ADD `customer_pickup_checklist_id` text;
ALTER TABLE `bookings` ADD `customer_return_checklist_id` text;
CREATE TABLE `__new_vehicle_checklists` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`vehicle_id` text NOT NULL,
	`type` text NOT NULL,
	`submission_source` text DEFAULT 'admin' NOT NULL,
	`items` text NOT NULL,
	`km_reading` real NOT NULL,
	`fuel_level` integer,
	`photos` text,
	`notes` text,
	`damage_notes` text,
	`created_by` text,
	`created_by_public_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_public_user_id`) REFERENCES `public_users`(`id`) ON UPDATE no action ON DELETE no action,
	CHECK ((`submission_source` = 'admin' AND `created_by` IS NOT NULL AND `created_by_public_user_id` IS NULL) OR (`submission_source` = 'customer' AND `created_by` IS NULL AND `created_by_public_user_id` IS NOT NULL))
);
INSERT INTO `__new_vehicle_checklists` (`id`, `booking_id`, `vehicle_id`, `type`, `items`, `km_reading`, `fuel_level`, `photos`, `notes`, `damage_notes`, `created_by`, `created_at`, `updated_at`)
SELECT `id`, `booking_id`, `vehicle_id`, `type`, `items`, `km_reading`, `fuel_level`, `photos`, `notes`, `damage_notes`, `created_by`, `created_at`, `updated_at` FROM `vehicle_checklists`;
DROP TABLE `vehicle_checklists`;
ALTER TABLE `__new_vehicle_checklists` RENAME TO `vehicle_checklists`;
CREATE INDEX `vehicle_checklists_booking_idx` ON `vehicle_checklists` (`booking_id`);
CREATE INDEX `vehicle_checklists_vehicle_idx` ON `vehicle_checklists` (`vehicle_id`);
CREATE INDEX `vehicle_checklists_type_idx` ON `vehicle_checklists` (`type`);
CREATE UNIQUE INDEX `vehicle_checklists_booking_type_source_unique` ON `vehicle_checklists` (`booking_id`, `type`, `submission_source`);
PRAGMA foreign_keys=ON;
