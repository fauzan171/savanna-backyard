-- Add cleaning_completed_at column to vehicles (declared in Drizzle schema but never migrated)
ALTER TABLE `vehicles` ADD `cleaning_completed_at` text;
