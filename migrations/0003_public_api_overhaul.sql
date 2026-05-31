-- ==========================================
-- Migration: Public API Overhaul
-- Date: 2026-05-29
-- ==========================================

-- 1. Alter vehicles: tambah kolom baru
ALTER TABLE vehicles ADD COLUMN category TEXT;
ALTER TABLE vehicles ADD COLUMN specs TEXT;
ALTER TABLE vehicles ADD COLUMN description TEXT;

-- 2. Alter bookings: tambah kolom payment
ALTER TABLE bookings ADD COLUMN payment_status TEXT;
ALTER TABLE bookings ADD COLUMN payment_method TEXT;
ALTER TABLE bookings ADD COLUMN snap_token TEXT;
ALTER TABLE bookings ADD COLUMN paid_at TEXT;

-- 3. Alter leads: tambah kolom preferensi
ALTER TABLE leads ADD COLUMN preferred_start TEXT;
ALTER TABLE leads ADD COLUMN preferred_end TEXT;
ALTER TABLE leads ADD COLUMN vehicle_interest TEXT;

-- 4. Create packages table
CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    image TEXT,
    duration TEXT,
    distance TEXT,
    group_size TEXT,
    price INTEGER NOT NULL,
    trail_id TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1 NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 5. Create pricing_tiers table
CREATE TABLE IF NOT EXISTS pricing_tiers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    daily_price INTEGER NOT NULL,
    multi_day_price INTEGER NOT NULL,
    features TEXT NOT NULL,
    not_included TEXT NOT NULL,
    highlighted INTEGER DEFAULT 0 NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1 NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 6. Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    rating INTEGER NOT NULL,
    text TEXT NOT NULL,
    avatar TEXT,
    is_published INTEGER DEFAULT 0 NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 7. Create trails table
CREATE TABLE IF NOT EXISTS trails (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    terrain TEXT,
    elevation TEXT,
    difficulty TEXT,
    recommended TEXT,
    image TEXT,
    map_image TEXT,
    blog_overview TEXT,
    blog_tips TEXT,
    blog_gallery TEXT,
    gpx_url TEXT,
    estimated_duration TEXT,
    distance TEXT,
    best_time TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1 NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 8. Seed system_configuration for settings
INSERT INTO system_configuration (id, key, value, description, updated_at, updated_by)
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
