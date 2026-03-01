-- Migration: Add token_blacklist table for JWT revocation
-- Created: 2026-03-01

-- Token blacklist table for storing revoked JWT tokens
CREATE TABLE IF NOT EXISTS `token_blacklist` (
	`id` text PRIMARY KEY NOT NULL,
	`jti` text NOT NULL UNIQUE,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);

-- Create index on jti for fast blacklist lookups
CREATE INDEX IF NOT EXISTS `token_blacklist_jti_idx` ON `token_blacklist` (`jti`);

-- Create index on token_hash for alternative lookups
CREATE INDEX IF NOT EXISTS `token_blacklist_token_hash_idx` ON `token_blacklist` (`token_hash`);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS `token_blacklist_expires_at_idx` ON `token_blacklist` (`expires_at`);
