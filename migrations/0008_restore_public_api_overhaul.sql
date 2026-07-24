-- ==========================================
-- Migration 0008: Restore orphaned public_api_overhaul (idempotent DDL)
-- ==========================================
-- Restores CREATE TABLE statements from the previously orphaned
-- 0003_public_api_overhaul.sql, which was missing from the drizzle journal
-- and therefore never applied on fresh deployments. All CREATE TABLE
-- statements use IF NOT EXISTS so they are safe on both fresh and
-- pre-populated databases.
--
-- NOTE: ALTER TABLE ... ADD COLUMN statements from the original migration
-- cannot be made idempotent in raw SQLite (no IF NOT EXISTS clause). Those
-- are applied by scripts/ensure-schema.ts which checks PRAGMA table_info
-- before each ALTER. Run that script after migrations in any environment
-- that may have skipped the orphaned SQL.

-- packages table
CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    image TEXT,
    duration TEXT,
    distance TEXT,
    group_size TEXT,
    price INTEGER NOT NULL DEFAULT 0,
    trail_id TEXT REFERENCES trails(id),
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- pricing_tiers table
CREATE TABLE IF NOT EXISTS pricing_tiers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    daily_price INTEGER NOT NULL DEFAULT 0,
    multi_day_price INTEGER NOT NULL DEFAULT 0,
    features TEXT NOT NULL DEFAULT '[]',
    not_included TEXT NOT NULL DEFAULT '[]',
    highlighted INTEGER NOT NULL DEFAULT 0,
    icon TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    rating INTEGER NOT NULL,
    text TEXT NOT NULL,
    avatar TEXT,
    is_published INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Seed default system_configuration only for keys that do not yet exist.
INSERT OR IGNORE INTO system_configuration (id, key, value, description, updated_at, updated_by)
VALUES
    (lower(hex(randomblob(16))), 'contact_email', 'hello@savannabromo.com', 'Contact email', datetime('now'), NULL),
    (lower(hex(randomblob(16))), 'contact_phone', '+6281234567890', 'Contact phone', datetime('now'), NULL),
    (lower(hex(randomblob(16))), 'whatsapp_number', '6281234567890', 'WhatsApp number (without +)', datetime('now'), NULL),
    (lower(hex(randomblob(16))), 'location', 'Malang, East Java', 'Business location', datetime('now'), NULL),
    (lower(hex(randomblob(16))), 'instagram_url', 'https://instagram.com/savannabromorental', 'Instagram URL', datetime('now'), NULL),
    (lower(hex(randomblob(16))), 'bank_name', 'BCA', 'Bank name for manual transfer', datetime('now'), NULL),
    (lower(hex(randomblob(16))), 'bank_account_number', '315 089 1234', 'Bank account number', datetime('now'), NULL),
    (lower(hex(randomblob(16))), 'bank_account_holder', 'Savanna Bromo Rental', 'Bank account holder name', datetime('now'), NULL),
    (lower(hex(randomblob(16))), 'deposit_amount', '500000', 'Deposit amount in IDR', datetime('now'), NULL),
    (lower(hex(randomblob(16))), 'deposit_description', 'Fully refundable', 'Deposit description', datetime('now'), NULL),
    (lower(hex(randomblob(16))), 'public_api_enabled', 'true', 'Enable/disable public API', datetime('now'), NULL),
    (lower(hex(randomblob(16))), 'public_api_key', 'savanna-dev-api-key-2026', 'API key for public endpoints', datetime('now'), NULL);

-- payment_page_url column (from orphaned 0004_add_payment_page_url.sql).
-- Guarded by ensure-schema.ts since SQLite has no ADD COLUMN IF NOT EXISTS.
