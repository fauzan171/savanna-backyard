PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_public_users` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`name` text,
	`email` text,
	`phone_verified` integer DEFAULT true NOT NULL,
	`device_fingerprint` text,
	`avatar_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_public_users`("id", "phone", "name", "email", "phone_verified", "device_fingerprint", "avatar_url", "is_active", "created_at", "updated_at") SELECT "id", "phone", "name", "email", "phone_verified", "device_fingerprint", "avatar_url", "is_active", "created_at", "updated_at" FROM `public_users`;--> statement-breakpoint
DROP TABLE `public_users`;--> statement-breakpoint
ALTER TABLE `__new_public_users` RENAME TO `public_users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `public_users_phone_unique` ON `public_users` (`phone`);--> statement-breakpoint
CREATE INDEX `public_users_phone_idx` ON `public_users` (`phone`);