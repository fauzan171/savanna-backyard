CREATE TABLE `booking_status_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`changed_by` text,
	`note` text,
	`created_at` text NOT NULL
);

CREATE INDEX `booking_status_logs_booking_idx` ON `booking_status_logs` (`booking_id`);
CREATE INDEX `booking_status_logs_created_idx` ON `booking_status_logs` (`created_at`);
