CREATE TABLE `packages` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tagline` text,
	`description` text,
	`image` text,
	`duration` text,
	`distance` text,
	`group_size` text,
	`price` integer NOT NULL,
	`trail_id` text,
	`sort_order` integer DEFAULT 0,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pricing_tiers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`daily_price` integer NOT NULL,
	`multi_day_price` integer NOT NULL,
	`features` text NOT NULL,
	`not_included` text NOT NULL,
	`highlighted` integer DEFAULT false NOT NULL,
	`icon` text,
	`sort_order` integer DEFAULT 0,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`location` text,
	`rating` integer NOT NULL,
	`text` text NOT NULL,
	`avatar` text,
	`is_published` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trails` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`terrain` text,
	`elevation` text,
	`difficulty` text,
	`recommended` text,
	`image` text,
	`map_image` text,
	`blog_overview` text,
	`blog_tips` text,
	`blog_gallery` text,
	`gpx_url` text,
	`estimated_duration` text,
	`distance` text,
	`best_time` text,
	`blog_subtitle` text,
	`blog_stages` text,
	`blog_checklist` text,
	`blog_culture` text,
	`blog_warning` text,
	`sort_order` integer DEFAULT 0,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `leads` ADD `preferred_start` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `preferred_end` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `vehicle_interest` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `category` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `specs` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `description` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `payment_status` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `payment_method` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `snap_token` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `payment_page_url` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `paid_at` text;