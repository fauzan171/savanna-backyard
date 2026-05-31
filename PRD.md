# SDD: Savanna Bromo Rental - Backend & CMS/Backyard
## Software Design Document

**Tanggal:** 29 Mei 2026
**Versi:** 3.0
**Status:** Ready for Implementation
**Project:** Savanna Bromo Rental - Motor Trail Rental Website
**Referensi FE:** `CONTRACT_API.md`

---

## Daftar Isi

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack & Cloudflare Services](#3-tech-stack--cloudflare-services)
4. [Database Design](#4-database-design)
5. [Public API (Landing Page)](#5-public-api-landing-page)
6. [Admin API (CMS/Backyard)](#6-admin-api-cmsbackyard)
7. [CMS/Backyard Frontend](#7-cmsbackyard-frontend)
8. [Authentication & Security](#8-authentication--security)
9. [Payment Integration (Midtrans)](#9-payment-integration-midtrans)
10. [Webhook System](#10-webhook-system)
11. [Response Format & Error Handling](#11-response-format--error-handling)
12. [Deployment & Cloudflare Setup](#12-deployment--cloudflare-setup)
13. [Migration Plan](#13-migration-plan)
14. [Seed Data](#14-seed-data)
15. [Implementation Order](#15-implementation-order)
16. [Testing Strategy](#16-testing-strategy)
17. [File Structure & Module Map](#17-file-structure--module-map)
18. [Environment Variables](#18-environment-variables)
19. [Risk & Mitigation](#19-risk--mitigation)

---

## 1. Executive Summary

Savanna Bromo Rental adalah platform rental motor trail di Bromo. Sistem ini terdiri dari 3 komponen:

| Komponen | Deskripsi | Teknologi |
|----------|-----------|-----------|
| **Landing Page (FE)** | Website publik untuk customer lihat kendaraan, paket, booking, contact | React (tim FE terpisah) |
| **Backend API (BE)** | Server yang melayani Landing Page + CMS | Cloudflare Workers + Hono + D1 |
| **CMS/Backyard** | Admin panel untuk manage seluruh operasional | React + React Router + Tailwind + shadcn/ui (monorepo sama BE) |

**Yang dibangun di SDD ini:** Backend API + CMS/Backyard (satu repo, satu Cloudflare Worker).

### Scope Perubahan

Backend saat ini sudah punya modul: auth, customers, vehicles, leads, bookings, payments, maintenance, dashboard, reports, public-api.

Perubahan yang diperlukan:

1. **Schema DB** - 3 tabel dimodifikasi + 4 tabel baru
2. **Public API** - 12 endpoint untuk FE Landing Page (sesuai `CONTRACT_API.md`)
3. **Admin API** - 26 endpoint baru untuk manage content (packages, pricing, reviews, trails, settings)
4. **CMS Frontend** - 14 halaman baru untuk manage content dinamis
5. **Midtrans Snap** - Integrasi payment pada booking flow
6. **Webhook** - Terima notifikasi pembayaran dari Midtrans
7. **Response format** - Standardisasi semua response ke `{ success, data, message, error }`
8. **MVP Phase 2** - 6 fitur operasional rental (lihat `PRD-MVP2.md`):
   - Inspeksi Kendaraan (pre/post rental)
   - Deposit System
   - Penalty / Denda
   - Verifikasi KTP/SIM
   - Surat Perjanjian Sewa
   - Notifikasi WhatsApp

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE                               │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Cloudflare Worker (Hono)                     │  │
│  │                                                           │  │
│  │  ┌─────────────────┐    ┌──────────────────────────────┐  │  │
│  │  │  Public API     │    │  Admin API (JWT Auth)         │  │  │
│  │  │  (API Key Auth) │    │                              │  │  │
│  │  │                 │    │  - Auth (login/logout/me)     │  │  │
│  │  │  - Availability │    │  - Customers CRUD            │  │  │
│  │  │  - Bookings     │    │  - Vehicles CRUD             │  │  │
│  │  │  - Leads        │    │  - Leads CRUD                │  │  │
│  │  │  - Vehicles     │    │  - Bookings Workflow         │  │  │
│  │  │  - Packages     │    │  - Payments Verify           │  │  │
│  │  │  - Pricing      │    │  - Maintenance               │  │  │
│  │  │  - Reviews      │    │  - Dashboard Stats           │  │  │
│  │  │  - Trails       │    │  - Reports                   │  │  │
│  │  │  - Settings     │    │  - Packages CRUD (NEW)       │  │  │
│  │  │  - Booking      │    │  - Pricing CRUD (NEW)        │  │  │
│  │  │    Status       │    │  - Reviews CRUD (NEW)        │  │  │
│  │  └─────────────────┘    │  - Trails CRUD (NEW)         │  │  │
│  │                         │  - Settings CRUD (NEW)        │  │  │
│  │  ┌─────────────────┐    │  - Users CRUD (NEW)          │  │  │
│  │  │  Webhook        │    └──────────────────────────────┘  │  │
│  │  │  (No Auth)      │                                      │  │
│  │  │                 │    ┌──────────────────────────────┐  │  │
│  │  │  - Midtrans     │    │  Static Assets (SPA)         │  │  │
│  │  │    Notification │    │  /dist/client/               │  │  │
│  │  └─────────────────┘    │  (CMS/Backyard React App)    │  │  │
│  │                         └──────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                    ┌─────────▼──────────┐                       │
│                    │  Cloudflare D1     │                       │
│                    │  (SQLite Database) │                       │
│                    └────────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

External:
┌──────────────┐         ┌──────────────┐
│  FE Landing  │────────▶│  BE API      │   X-API-Key header
│  Page        │         │  /api/v1/    │
└──────────────┘         └──────────────┘

┌──────────────┐         ┌──────────────┐
│  Midtrans    │────────▶│  Webhook     │   Signature verification
│  Server      │         │  /api/v1/    │
└──────────────┘         └──────────────┘
```

### 2.2 Request Flow

**Landing Page → BE:**
```
Browser → fetch('/api/v1/public/availability', { headers: { 'X-API-Key': 'xxx' } })
       → Cloudflare Worker
       → CORS middleware (check ALLOWED_PUBLIC_API_ORIGINS)
       → API Key middleware (validate against system_configuration)
       → Public API route handler
       → D1 Database
       → Response { success, data }
```

**CMS/Backyard → BE:**
```
Browser → fetch('/api/v1/vehicles', { credentials: 'include' })
       → Cloudflare Worker
       → CORS middleware (check CORS_ALLOWED_ORIGINS)
       → Auth middleware (validate JWT dari httpOnly cookie)
       → Admin route handler
       → D1 Database
       → Response { success, data }
```

**Midtrans → Webhook:**
```
Midtrans → POST /api/v1/webhooks/midtrans/notification
        → Cloudflare Worker
        → Verify signature (SHA-512)
        → Find booking by order_id
        → Update booking status + payment_status
        → Create payment record
        → Response { status_code: "200" }
```

---

## 3. Tech Stack & Cloudflare Services

### 3.1 Tech Stack

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| Runtime | Cloudflare Workers | - |
| Backend Framework | Hono | ^4.11 |
| Database | Cloudflare D1 (SQLite) | - |
| ORM | Drizzle ORM | ^0.38 |
| Language | TypeScript | ^5.8 |
| Frontend (CMS) | React 19 | ^19.0 |
| Router (CMS) | React Router v7 | ^7.0 |
| Styling (CMS) | Tailwind CSS v4 | ^4.0 |
| UI Components | shadcn/ui (Radix) | - |
| State (CMS) | Zustand + TanStack Query | ^5.0 / ^5.60 |
| Validation | Zod | ^3.23 |
| Auth (Admin) | JWT (httpOnly cookie) | @tsndr/cloudflare-worker-jwt |
| Auth (Public) | X-API-Key header | - |
| Payment | Midtrans Snap | Sandbox → Production |
| Build | Vite + @cloudflare/vite-plugin | ^6.0 |
| Password Hashing | PBKDF2-SHA256 (Web Crypto) | - |

### 3.2 Cloudflare Services

| Service | Penggunaan | Konfigurasi |
|---------|------------|-------------|
| **Workers** | Runtime BE + serve CMS SPA | `wrangler.toml` → `main = "./src/worker/index.ts"` |
| **D1** | Database SQLite | `wrangler.toml` → `[[d1_databases]]` binding `DB` |
| **Workers Assets** | Serve CMS static files | `wrangler.toml` → `[assets] directory = "./dist/client"` |
| **Wrangler** | CLI dev + deploy | `npm run dev` (local), `npm run deploy` (production) |

### 3.3 Kenapa Semua di Cloudflare?

| Keuntungan | Penjelasan |
|------------|------------|
| Zero cold start | Workers selalu warm |
| Edge deployment | Auto-deploy ke 300+ lokasi |
| D1 free tier | 5M rows read, 100K rows write/hari |
| Single deployment | BE + CMS frontend deploy sekali |
| Built-in CORS | Hono middleware handle CORS |
| Cost efficient | Free tier cukup untuk development |

---

## 4. Database Design

### 4.1 Entity Relationship Diagram

```
users ─────────────────────────────────────────────────────────┐
  │                                                            │
  │ 1:N                                                        │
  ▼                                                            │
customers ──┐    vehicles ──┐    packages ──┐    trails ──┐    │
            │               │               │             │    │
            │ 1:N           │ 1:N           │             │    │
            ▼               ▼               │             │    │
        bookings ──────► booking_addons     │             │    │
            │                               │             │    │
            │ 1:N                           │             │    │
            ▼                               │             │    │
        payments                            │             │    │
                                            │             │    │
leads ──────────────────────────────────────┘             │    │
                                            │             │    │
pricing_tiers ──────────────────────────────┘             │    │
reviews ────────────────────────────────────┘             │    │
                                            │             │    │
maintenance_records ────────────────────────┘             │    │
                                            │             │    │
vehicle_status_logs ─────────────────────────┘             │    │
                                                            │    │
system_configuration ──────────────────────────────────────┘    │
                                                                 │
token_blacklist ─────────────────────────────────────────────────┘
```

### 4.2 Tabel Existing yang Dimodifikasi

#### `vehicles` — Tambah 3 kolom

```sql
-- Kolom baru
ALTER TABLE vehicles ADD COLUMN category TEXT;       -- "150cc Trail", "250cc Trail"
ALTER TABLE vehicles ADD COLUMN specs TEXT;          -- JSON: { engine, power, weight, seat }
ALTER TABLE vehicles ADD COLUMN description TEXT;    -- Deskripsi untuk FE landing page
```

**Schema Drizzle (`src/worker/core/database/schema/vehicles.ts`):**

```typescript
export const vehicles = sqliteTable('vehicles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  plateNumber: text('plate_number').notNull().unique(),
  type: text('type', { enum: ['TrailBike', 'StreetBike', 'Car', 'Jeep', 'Other'] }).notNull(),
  brand: text('brand'),
  model: text('model'),
  year: integer('year'),
  category: text('category'),                          // NEW
  specs: text('specs'),                                // NEW - JSON
  description: text('description'),                    // NEW
  dailyRateIdr: real('daily_rate_idr').notNull(),
  dailyRateUsd: real('daily_rate_usd'),
  status: text('status', { enum: ['Available', 'Rented', 'Maintenance', 'Inactive'] }).notNull().default('Available'),
  totalKm: real('total_km').default(0),
  photoUrl: text('photo_url'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  statusIdx: index('vehicles_status_idx').on(table.status),
  typeIdx: index('vehicles_type_idx').on(table.type),
  plateIdx: index('vehicles_plate_idx').on(table.plateNumber),
}));
```

#### `bookings` — Tambah 4 kolom + update status enum

```sql
-- Kolom baru
ALTER TABLE bookings ADD COLUMN payment_status TEXT;   -- pending, settlement, deny, expire, cancel, refund
ALTER TABLE bookings ADD COLUMN payment_method TEXT;   -- online, manual
ALTER TABLE bookings ADD COLUMN snap_token TEXT;       -- Midtrans Snap token
ALTER TABLE bookings ADD COLUMN paid_at TEXT;          -- Timestamp pembayaran berhasil
```

**Status enum diperluas:**
- Existing: `Pending`, `Confirmed`, `Active`, `Completed`, `Cancelled`
- Baru ditambah: `pending_payment`, `payment_failed`, `expired`, `refunded`

**Schema Drizzle (`src/worker/core/database/schema/bookings.ts`):**

```typescript
export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(),
  bookingNumber: text('booking_number').notNull().unique(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  vehicleId: text('vehicle_id').notNull().references(() => vehicles.id),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  actualReturnDate: text('actual_return_date'),
  startKm: real('start_km'),
  endKm: real('end_km'),
  status: text('status', {
    enum: ['Pending', 'pending_payment', 'Confirmed', 'Active', 'Completed',
           'Cancelled', 'payment_failed', 'expired', 'refunded']
  }).notNull().default('Pending'),
  paymentTerms: text('payment_terms', { enum: ['DP_Pickup', 'Full_Upfront', 'DP_After', 'Flexible'] }).notNull(),
  paymentStatus: text('payment_status'),               // NEW
  paymentMethod: text('payment_method'),               // NEW
  snapToken: text('snap_token'),                       // NEW
  paidAt: text('paid_at'),                             // NEW
  baseAmount: real('base_amount').notNull(),
  addonsAmount: real('addons_amount').default(0),
  lateFee: real('late_fee').default(0),
  totalAmount: real('total_amount').notNull(),
  currency: text('currency', { enum: ['IDR', 'USD'] }).notNull().default('IDR'),
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id),
  cancelledAt: text('cancelled_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  customerIdx: index('bookings_customer_idx').on(table.customerId),
  vehicleIdx: index('bookings_vehicle_idx').on(table.vehicleId),
  statusIdx: index('bookings_status_idx').on(table.status),
  datesIdx: index('bookings_dates_idx').on(table.startDate, table.endDate),
  numberIdx: index('bookings_number_idx').on(table.bookingNumber),
}));
```

#### `leads` — Tambah 3 kolom

```sql
ALTER TABLE leads ADD COLUMN preferred_start TEXT;     -- YYYY-MM-DD
ALTER TABLE leads ADD COLUMN preferred_end TEXT;       -- YYYY-MM-DD
ALTER TABLE leads ADD COLUMN vehicle_interest TEXT;    -- TrailBike, StreetBike, Car, Jeep, Other
```

### 4.3 Tabel Baru

#### `packages` — Paket Tour

```typescript
// src/worker/core/database/schema/packages.ts
export const packages = sqliteTable('packages', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  tagline: text('tagline'),
  description: text('description'),
  image: text('image'),
  duration: text('duration'),
  distance: text('distance'),
  groupSize: text('group_size'),
  price: integer('price').notNull(),
  trailId: text('trail_id'),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});
```

#### `pricing_tiers` — Tier Harga Rental

```typescript
// src/worker/core/database/schema/pricing-tiers.ts
export const pricingTiers = sqliteTable('pricing_tiers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  dailyPrice: integer('daily_price').notNull(),
  multiDayPrice: integer('multi_day_price').notNull(),
  features: text('features').notNull(),        // JSON array of strings
  notIncluded: text('not_included').notNull(), // JSON array of strings
  highlighted: integer('highlighted', { mode: 'boolean' }).notNull().default(false),
  icon: text('icon'),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});
```

#### `reviews` — Review/Testimoni

```typescript
// src/worker/core/database/schema/reviews.ts
export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location'),
  rating: integer('rating').notNull(),
  text: text('text').notNull(),
  avatar: text('avatar'),
  isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});
```

#### `trails` — Trail/Rute

```typescript
// src/worker/core/database/schema/trails.ts
export const trails = sqliteTable('trails', {
  id: text('id').primaryKey(),  // slug: "sea-of-sand"
  name: text('name').notNull(),
  description: text('description'),
  terrain: text('terrain'),
  elevation: text('elevation'),
  difficulty: text('difficulty'),
  recommended: text('recommended'),
  image: text('image'),
  mapImage: text('map_image'),
  blogOverview: text('blog_overview'),
  blogTips: text('blog_tips'),
  blogGallery: text('blog_gallery'),    // JSON array of image URLs
  gpxUrl: text('gpx_url'),
  estimatedDuration: text('estimated_duration'),
  distance: text('distance'),
  bestTime: text('best_time'),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});
```

### 4.4 System Configuration Keys (Settings)

Tabel `system_configuration` sudah ada. Keys untuk endpoint `/public/settings`:

| Key | Value | Keterangan |
|-----|-------|------------|
| `contact_email` | `hello@savannabromo.com` | Email kontak |
| `contact_phone` | `+6281234567890` | Nomor telepon |
| `whatsapp_number` | `6281234567890` | Nomor WA (tanpa +) |
| `location` | `Malang, East Java` | Lokasi |
| `instagram_url` | `https://instagram.com/savannabromorental` | URL Instagram |
| `bank_name` | `BCA` | Nama bank |
| `bank_account_number` | `315 089 1234` | Nomor rekening |
| `bank_account_holder` | `Savanna Bromo Rental` | Nama pemilik rekening |
| `deposit_amount` | `500000` | Nominal deposit |
| `deposit_description` | `Fully refundable` | Keterangan deposit |
| `public_api_enabled` | `true` | Aktifkan/nonaktifkan Public API |
| `public_api_key` | *(generated)* | API key untuk FE Landing Page |

---

## 5. Public API (Landing Page)

Semua endpoint di bawah `GET/POST /api/v1/public/*`.
Auth: `X-API-Key` header.
CORS: `ALLOWED_PUBLIC_API_ORIGINS` env var.

### 5.1 FASE 1 — Urgent

#### `GET /public/availability`

| Item | Detail |
|------|--------|
| **Dipanggil saat** | User pilih tanggal di Booking Modal |
| **Status** | Sudah ada, perlu minor adjustment response format |
| **Auth** | X-API-Key |

**Query Params:**

| Param | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| startDate | string | Ya | YYYY-MM-DD |
| endDate | string | Ya | YYYY-MM-DD |
| type | string | Tidak | TrailBike, StreetBike, Car, Jeep, Other |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "requestedPeriod": { "startDate": "2026-06-01", "endDate": "2026-06-03" },
    "availableVehicles": [
      { "id": "uuid", "name": "Honda CRF 150L", "type": "TrailBike", "dailyRateIdr": 200000, "photoUrl": "/images/bike_crf150.jpg" }
    ],
    "unavailableVehicles": [
      { "id": "uuid", "name": "Honda CRF 250L", "reason": "Booked for the selected dates" }
    ],
    "totalAvailable": 1
  }
}
```

**Response 400:**

```json
{
  "success": false,
  "message": "Invalid date range",
  "error": { "code": "INVALID_INPUT", "message": "startDate must be before or equal to endDate" }
}
```

---

#### `POST /public/bookings`

| Item | Detail |
|------|--------|
| **Dipanggil saat** | User klik bayar di Booking Modal |
| **Status** | Sudah ada basic, perlu: booking number format `SVN-YYYY-NNNN`, tambah kolom payment, status awal `pending_payment` |
| **Auth** | X-API-Key |

**Request Body:**

```json
{
  "vehicleId": "uuid",
  "startDate": "2026-06-01",
  "endDate": "2026-06-03",
  "customerName": "Ahmad Rizki",
  "customerPhone": "+6281234567890",
  "customerEmail": "ahmad@email.com",
  "notes": "Catatan tambahan"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "bookingId": "uuid",
    "bookingNumber": "SVN-2026-0001",
    "snapToken": "midtrans-snap-token-string",
    "snapRedirectUrl": "https://app.sandbox.midtrans.com/snap/v2/redirection/xxx",
    "totalAmount": 400000
  }
}
```

**Business Flow:**
1. Validasi input (Zod)
2. Cek vehicle exists & available
3. Cek date conflicts
4. Find or create customer (by phone)
5. Hitung total = `days x dailyRateIdr`
6. Generate booking number `SVN-YYYY-NNNN`
7. Create booking: status=`pending_payment`, paymentStatus=`pending`, paymentMethod=`online`
8. Hit Midtrans Snap API → dapat `token` + `redirect_url`
9. Simpan `snapToken` ke booking
10. Return response

**Midtrans Snap API:**

```
POST https://app.sandbox.midtrans.com/snap/v1/transactions
Authorization: Basic <BASE64(ServerKey:)>

Body:
{
  "transaction_details": { "order_id": "SVN-2026-0001", "gross_amount": 400000 },
  "item_details": [{ "id": "vehicle-uuid", "price": 200000, "quantity": 2, "name": "Honda CRF 150L Rental (2 days)" }],
  "customer_details": { "first_name": "Ahmad", "last_name": "Rizki", "email": "ahmad@email.com", "phone": "+6281234567890" }
}

Response:
{ "token": "snap-token-xxx", "redirect_url": "https://app.sandbox.midtrans.com/snap/v2/redirection/xxx" }
```

---

#### `POST /public/leads`

| Item | Detail |
|------|--------|
| **Dipanggil saat** | User submit form Contact |
| **Status** | Sudah ada, perlu tambah kolom `preferred_start`, `preferred_end`, `vehicle_interest` |
| **Auth** | X-API-Key |

**Request Body:**

```json
{
  "name": "Sarah Chen",
  "phone": "+6281234567890",
  "email": "sarah@email.com",
  "message": "Saya tertarik rental untuk 2 orang",
  "source": "Website",
  "preferredDates": {
    "start": "2026-06-15",
    "end": "2026-06-15",
    "vehicleInterest": "TrailBike",
    "vehicleTypeId": null
  }
}
```

**Response 200:**

```json
{
  "success": true,
  "message": "Lead submitted successfully",
  "data": { "id": "uuid", "status": "New", "createdAt": "2026-05-28T10:30:00Z" }
}
```

---

#### `POST /webhooks/midtrans/notification`

| Item | Detail |
|------|--------|
| **Dipanggil oleh** | Midtrans server (otomatis setelah bayar) |
| **Status** | Sudah ada di `/payments/webhooks/:vendor`, perlu tambah route alias |
| **Auth** | Tidak ada (signature verification) |

**Body dari Midtrans:**

```json
{
  "transaction_time": "2026-05-28 10:30:00",
  "transaction_status": "settlement",
  "transaction_id": "midtrans-txn-001",
  "status_code": "200",
  "signature_key": "abc123...",
  "payment_type": "qris",
  "order_id": "SVN-2026-0001",
  "gross_amount": "400000.00",
  "fraud_status": "accept"
}
```

**Proses:**
1. Verifikasi signature: SHA-512(`order_id + status_code + gross_amount + server_key`)
2. Find booking by `order_id` (field `bookingNumber`)
3. Update booking status + payment_status:

| Midtrans `transaction_status` | Booking `status` | Booking `paymentStatus` |
|-------------------------------|------------------|------------------------|
| `capture` | `Confirmed` | `settlement` |
| `settlement` | `Confirmed` | `settlement` |
| `pending` | `pending_payment` | `pending` |
| `deny` | `payment_failed` | `deny` |
| `expire` | `expired` | `expire` |
| `cancel` | `Cancelled` | `cancel` |
| `refund` | `refunded` | `refund` |

4. Jika payment berhasil → create payment record + auto-verify
5. Set `paidAt` pada booking

**Response ke Midtrans:**

```json
{ "status_code": "200", "status_message": "OK" }
```

---

### 5.2 FASE 2 — Data Dinamis

#### `GET /public/vehicles`

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid", "name": "Honda CRF 150L", "type": "TrailBike",
      "category": "150cc Trail", "image": "/images/bike_crf150.jpg",
      "dailyRateIdr": 200000,
      "specs": { "engine": "149.15 cc", "power": "12.4 HP", "weight": "122 kg", "seat": "865 mm" },
      "description": "A real Indonesian dual-sport favorite...",
      "available": true
    }
  ]
}
```

---

#### `GET /public/packages`

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid", "name": "Self-Ride Day", "tagline": "Bike, helmet, route map.",
      "description": "...", "image": "/images/package_sunrise.jpg",
      "duration": "1 day", "distance": "Flexible", "groupSize": "1-2 riders",
      "price": 180000, "trailId": "sea-of-sand"
    }
  ]
}
```

---

#### `GET /public/pricing`

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid", "name": "Ride Only", "description": "For the independent rider",
      "dailyPrice": 150000, "multiDayPrice": 120000,
      "features": ["Motorcycle rental", "Standard helmet", "Basic insurance", "24/7 roadside support"],
      "notIncluded": ["Riding gear", "Raincoat", "Phone holder", "Route guide"],
      "highlighted": false, "icon": "Bike"
    }
  ]
}
```

---

#### `GET /public/reviews`

**Query Params (opsional):** `limit`, `offset`, `rating`

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid", "name": "Ahmad Rizki", "location": "Jakarta",
      "rating": 5, "text": "Motor bersih, pelayanan ramah...",
      "avatar": "AR", "createdAt": "2026-05-20T08:00:00Z"
    }
  ],
  "meta": { "total": 5, "averageRating": 5.0 }
}
```

---

#### `GET /public/trails`

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "sea-of-sand", "name": "Sea of Sand Loop",
      "desc": "The classic Bromo crossing through volcanic sand dunes.",
      "terrain": "Volcanic Sand, Gravel", "elevation": "2,100m - 2,329m",
      "difficulty": "Moderate", "recommended": "CRF 150L / KLX 150",
      "image": "/images/dayride_bike_landscape.jpg", "mapImage": "/images/map_sea_of_sand.png"
    }
  ]
}
```

---

#### `GET /public/trails/:trailId`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "sea-of-sand", "name": "Sea of Sand Loop", "desc": "...",
    "terrain": "...", "elevation": "...", "difficulty": "Moderate",
    "recommended": "...", "image": "...", "mapImage": "...",
    "blogContent": {
      "overview": "Konten blog...", "tips": "Tips...",
      "gallery": ["/images/trail/sea_1.jpg"],
      "gpxUrl": "/gpx/sea_of_sand.gpx",
      "estimatedDuration": "2-3 hours", "distance": "25 km",
      "bestTime": "Dry season (April - October)"
    }
  }
}
```

---

#### `GET /public/settings`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "contactEmail": "hello@savannabromo.com",
    "contactPhone": "+6281234567890",
    "whatsappNumber": "6281234567890",
    "location": "Malang, East Java",
    "instagramUrl": "https://instagram.com/savannabromorental",
    "bankAccount": { "bankName": "BCA", "accountNumber": "315 089 1234", "accountHolder": "Savanna Bromo Rental" },
    "deposit": { "amount": 500000, "description": "Fully refundable" }
  }
}
```

---

#### `GET /public/bookings/:bookingNumber/status`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "bookingNumber": "SVN-2026-0001", "status": "confirmed",
    "paymentStatus": "settlement", "vehicleName": "Honda CRF 150L",
    "startDate": "2026-06-01", "endDate": "2026-06-03",
    "totalAmount": 400000, "paidAt": "2026-05-28T10:35:00Z"
  }
}
```

---

## 6. Admin API (CMS/Backyard)

Semua endpoint di bawah `/api/v1/*` (kecuali `/public/*` dan `/webhooks/*`).
Auth: JWT httpOnly cookie (`token`).
Role: `SUPER_ADMIN` atau `STAFF`.

### 6.1 Existing Admin Endpoints (Tidak Berubah)

| Module | Endpoints | Status |
|--------|-----------|--------|
| **Auth** | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` | Done |
| **Customers** | `GET/POST /customers`, `GET/PATCH /customers/:id`, `PATCH /customers/:id/blacklist`, `GET /customers/by-phone/:phone` | Done |
| **Vehicles** | `GET/POST /vehicles`, `GET/PATCH /vehicles/:id`, `PATCH /vehicles/:id/status`, `GET /vehicles/availability`, `GET /vehicles/:id/calendar` | Done |
| **Leads** | `GET/POST /leads`, `GET/PATCH /leads/:id`, `PATCH /leads/:id/status`, `POST /leads/:id/notes`, `POST /leads/:id/assign`, `GET /leads/stats` | Done |
| **Bookings** | `GET/POST /bookings`, `GET/PATCH /bookings/:id`, `GET /bookings/number/:number`, `POST /bookings/:id/confirm`, `POST /bookings/:id/start`, `POST /bookings/:id/complete`, `POST /bookings/:id/extend`, `POST /bookings/:id/cancel`, `POST /bookings/:id/addons`, `DELETE /bookings/:id/addons/:addonId`, `GET /bookings/availability`, `GET /bookings/stats` | Done |
| **Payments** | `GET /payments`, `GET /payments/:id`, `POST /payments`, `POST /payments/:id/verify`, `POST /payments/:id/reject`, `GET /payments/pending`, `GET /payments/stats`, `GET /payments/gateway/status` | Done |
| **Maintenance** | `GET/POST /maintenance`, `GET/PATCH /maintenance/:id`, `POST /maintenance/:id/start`, `POST /maintenance/:id/complete`, `GET /maintenance/upcoming`, `GET /maintenance/vehicles/:vehicleId/history`, `GET /maintenance/vehicles/:vehicleId/summary` | Done |
| **Dashboard** | `GET /dashboard/overview`, `/revenue`, `/leads`, `/fleet`, `/payments`, `/activities` | Done |
| **Reports** | `GET /reports/revenue`, `/fleet-utilization`, `/lead-sources`, `/payments`, `/customers` (supports `?format=csv`) | Done |

### 6.2 Admin Endpoints BARU (Content Management)

#### Packages CRUD

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/v1/packages` | List semua packages (with pagination, filter by is_active) |
| GET | `/api/v1/packages/:id` | Get package by ID |
| POST | `/api/v1/packages` | Create package (SUPER_ADMIN only) |
| PATCH | `/api/v1/packages/:id` | Update package (SUPER_ADMIN only) |
| DELETE | `/api/v1/packages/:id` | Soft delete / deactivate (SUPER_ADMIN only) |
| PATCH | `/api/v1/packages/:id/toggle` | Toggle isActive |

**Create/Update Package Request:**

```json
{
  "name": "Self-Ride Day",
  "tagline": "Bike, helmet, route map.",
  "description": "A clean trail bike, basic gear...",
  "image": "/images/package_sunrise.jpg",
  "duration": "1 day",
  "distance": "Flexible",
  "groupSize": "1-2 riders",
  "price": 180000,
  "trailId": "sea-of-sand",
  "sortOrder": 0,
  "isActive": true
}
```

#### Pricing Tiers CRUD

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/v1/pricing` | List semua pricing tiers |
| GET | `/api/v1/pricing/:id` | Get pricing tier by ID |
| POST | `/api/v1/pricing` | Create pricing tier (SUPER_ADMIN only) |
| PATCH | `/api/v1/pricing/:id` | Update pricing tier (SUPER_ADMIN only) |
| DELETE | `/api/v1/pricing/:id` | Soft delete (SUPER_ADMIN only) |
| PATCH | `/api/v1/pricing/:id/toggle` | Toggle isActive |

**Create/Update Pricing Request:**

```json
{
  "name": "Ride Only",
  "description": "For the independent rider",
  "dailyPrice": 150000,
  "multiDayPrice": 120000,
  "features": ["Motorcycle rental", "Standard helmet"],
  "notIncluded": ["Riding gear", "Raincoat"],
  "highlighted": false,
  "icon": "Bike",
  "sortOrder": 0,
  "isActive": true
}
```

#### Reviews CRUD

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/v1/reviews` | List semua reviews (filter by is_published, rating) |
| GET | `/api/v1/reviews/:id` | Get review by ID |
| POST | `/api/v1/reviews` | Create review |
| PATCH | `/api/v1/reviews/:id` | Update review |
| DELETE | `/api/v1/reviews/:id` | Delete review (SUPER_ADMIN only) |
| PATCH | `/api/v1/reviews/:id/toggle` | Toggle publish/unpublish |

**Create/Update Review Request:**

```json
{
  "name": "Ahmad Rizki",
  "location": "Jakarta",
  "rating": 5,
  "text": "Motor bersih, pelayanan ramah...",
  "avatar": "AR",
  "isPublished": true
}
```

#### Trails CRUD

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/v1/trails` | List semua trails |
| GET | `/api/v1/trails/:id` | Get trail by ID (slug) |
| POST | `/api/v1/trails` | Create trail (SUPER_ADMIN only) |
| PATCH | `/api/v1/trails/:id` | Update trail (SUPER_ADMIN only) |
| DELETE | `/api/v1/trails/:id` | Soft delete (SUPER_ADMIN only) |
| PATCH | `/api/v1/trails/:id/toggle` | Toggle isActive |

**Create/Update Trail Request:**

```json
{
  "id": "sea-of-sand",
  "name": "Sea of Sand Loop",
  "description": "The classic Bromo crossing...",
  "terrain": "Volcanic Sand, Gravel",
  "elevation": "2,100m - 2,329m",
  "difficulty": "Moderate",
  "recommended": "CRF 150L / KLX 150",
  "image": "/images/dayride_bike_landscape.jpg",
  "mapImage": "/images/map_sea_of_sand.png",
  "blogOverview": "...",
  "blogTips": "...",
  "blogGallery": "[\"/images/trail/sea_1.jpg\"]",
  "gpxUrl": "/gpx/sea_of_sand.gpx",
  "estimatedDuration": "2-3 hours",
  "distance": "25 km",
  "bestTime": "Dry season (April - October)",
  "sortOrder": 0,
  "isActive": true
}
```

#### Settings CRUD

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/v1/settings` | List semua settings |
| PATCH | `/api/v1/settings` | Bulk update settings (SUPER_ADMIN only) |
| GET | `/api/v1/settings/:key` | Get single setting |
| PATCH | `/api/v1/settings/:key` | Update single setting (SUPER_ADMIN only) |

**Bulk Update Settings Request:**

```json
{
  "settings": [
    { "key": "contact_email", "value": "hello@savannabromo.com" },
    { "key": "whatsapp_number", "value": "6281234567890" },
    { "key": "bank_name", "value": "BCA" }
  ]
}
```

#### Users Management (NEW)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/v1/users` | List users (SUPER_ADMIN only) |
| POST | `/api/v1/users` | Create staff user (SUPER_ADMIN only) |
| PATCH | `/api/v1/users/:id` | Update user (SUPER_ADMIN only) |
| PATCH | `/api/v1/users/:id/toggle` | Toggle isActive (SUPER_ADMIN only) |
| PATCH | `/api/v1/users/:id/password` | Change password |

---

## 7. CMS/Backyard Frontend

### 7.1 Halaman Existing (Tidak Berubah)

| Route | Halaman | Status |
|-------|---------|--------|
| `/login` | Login page | Done |
| `/` | Dashboard | Done |
| `/customers` | Customers list + detail | Done |
| `/vehicles` | Vehicles list + detail | Done |
| `/leads` | Leads list + detail | Done |
| `/bookings` | Bookings list + detail | Done |
| `/payments` | Payments list + detail | Done |
| `/maintenance` | Maintenance list + detail | Done |
| `/reports/*` | Reports (revenue, fleet, leads, payments, customers) | Done |

### 7.2 Halaman BARU yang Perlu Dibuat

| Route | Halaman | Komponen | Keterangan |
|-------|---------|----------|------------|
| `/packages` | Packages list | `PackagesPage` | Tabel list packages, toggle active, sort |
| `/packages/:id` | Package detail/edit | `PackageDetailPage` | Form edit package |
| `/pricing` | Pricing tiers list | `PricingPage` | Tabel list pricing tiers |
| `/pricing/:id` | Pricing detail/edit | `PricingDetailPage` | Form edit pricing |
| `/reviews` | Reviews list | `ReviewsPage` | Tabel list reviews, toggle publish |
| `/reviews/:id` | Review detail/edit | `ReviewDetailPage` | Form edit review |
| `/trails` | Trails list | `TrailsPage` | Tabel list trails |
| `/trails/:id` | Trail detail/edit | `TrailDetailPage` | Form edit trail + blog content |
| `/settings` | Settings page | `SettingsPage` | Form edit semua settings |
| `/users` | Users list | `UsersPage` | Tabel list users (SUPER_ADMIN only) |

### 7.3 Sidebar Navigation Update

```
Dashboard
Customers
Vehicles
Leads
Bookings
Payments
Maintenance
---
Packages       <-- NEW
Pricing        <-- NEW
Reviews        <-- NEW
Trails         <-- NEW
---
Settings       <-- NEW
Users          <-- NEW
---
Reports
```

### 7.4 File Structure untuk CMS Frontend

```
src/react-app/features/
├── auth/              # Done
├── dashboard/         # Done
├── customers/         # Done
├── vehicles/          # Done
├── leads/             # Done
├── bookings/          # Done
├── payments/          # Done
├── maintenance/       # Done
├── reports/           # Done
├── shared/            # Done
├── packages/          # NEW
│   ├── pages/
│   │   ├── PackagesPage.tsx
│   │   └── PackageDetailPage.tsx
│   ├── components/
│   │   └── PackageForm.tsx
│   ├── hooks/
│   │   └── usePackages.ts
│   └── api/
│       └── packages.ts
├── pricing/           # NEW
│   ├── pages/
│   │   ├── PricingPage.tsx
│   │   └── PricingDetailPage.tsx
│   ├── components/
│   │   └── PricingForm.tsx
│   ├── hooks/
│   │   └── usePricing.ts
│   └── api/
│       └── pricing.ts
├── reviews/           # NEW
│   ├── pages/
│   │   ├── ReviewsPage.tsx
│   │   └── ReviewDetailPage.tsx
│   ├── components/
│   │   └── ReviewForm.tsx
│   ├── hooks/
│   │   └── useReviews.ts
│   └── api/
│       └── reviews.ts
├── trails/            # NEW
│   ├── pages/
│   │   ├── TrailsPage.tsx
│   │   └── TrailDetailPage.tsx
│   ├── components/
│   │   └── TrailForm.tsx
│   ├── hooks/
│   │   └── useTrails.ts
│   └── api/
│       └── trails.ts
├── settings/          # NEW
│   ├── pages/
│   │   └── SettingsPage.tsx
│   ├── hooks/
│   │   └── useSettings.ts
│   └── api/
│       └── settings.ts
└── users/             # NEW
    ├── pages/
    │   └── UsersPage.tsx
    ├── hooks/
    │   └── useUsers.ts
    └── api/
        └── users.ts
```

---

## 8. Authentication & Security

### 8.1 Admin Auth (JWT)

```
Login Flow:
1. POST /api/v1/auth/login { email, password }
2. Backend verify password (PBKDF2-SHA256)
3. Generate JWT { userId, role, jti, exp }
4. Set httpOnly cookie: token=<jwt>, Max-Age=604800, SameSite=Strict
5. Return { data: { id, name, email, role } }

Every Request:
1. Cookie: token=<jwt>
2. Auth middleware extract + verify JWT
3. Set c.set('user', { userId, role })
4. Route handler akses c.get('user')

Logout:
1. POST /api/v1/auth/logout
2. Add token JTI to token_blacklist table
3. Clear cookie
```

### 8.2 Public API Auth (API Key)

```
Every Public Request:
1. Header: X-API-Key: <key>
2. API Key middleware check system_configuration table
3. Key: public_api_enabled = true
4. Key: public_api_key = <key>
5. If valid → continue, else → 401
```

### 8.3 Security Headers

```typescript
// Already implemented in src/worker/index.ts
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000 (production only)
```

### 8.4 CORS Configuration

| Context | Allowed Origins | Credentials |
|---------|----------------|-------------|
| Admin API | `CORS_ALLOWED_ORIGINS` env var | `true` (cookies) |
| Public API | `ALLOWED_PUBLIC_API_ORIGINS` env var | `false` |
| Webhooks | All (Midtrans server) | `false` |

---

## 9. Payment Integration (Midtrans)

### 9.1 Midtrans Snap Flow

```
Customer          FE Landing Page       Backend (Worker)       Midtrans
   │                    │                      │                    │
   │  Pilih kendaraan   │                      │                    │
   │───────────────────▶│                      │                    │
   │                    │  POST /public/       │                    │
   │                    │  bookings            │                    │
   │                    │─────────────────────▶│                    │
   │                    │                      │  Create Snap Txn   │
   │                    │                      │───────────────────▶│
   │                    │                      │  { token, url }    │
   │                    │                      │◀───────────────────│
   │                    │  { snapRedirectUrl } │                    │
   │                    │◀─────────────────────│                    │
   │  Open redirect URL │                      │                    │
   │◀───────────────────│                      │                    │
   │                    │                      │                    │
   │  Payment completed │                      │                    │
   │                    │                      │  Webhook notif     │
   │                    │                      │◀───────────────────│
   │                    │                      │  Update booking    │
   │                    │                      │  status=Confirmed  │
   │                    │                      │  paymentStatus=    │
   │                    │                      │  settlement        │
```

### 9.2 Environment

| Env | Snap URL | Server Key |
|-----|----------|------------|
| Sandbox | `https://app.sandbox.midtrans.com/snap/v1/transactions` | `Mid-server-lr4rXOoe3sr52y2ueNjMfWaJ` |
| Production | `https://app.midtrans.com/snap/v1/transactions` | Set via `wrangler secret put` |

### 9.3 Booking Number Format

Format: `SVN-YYYY-NNNN`
- `SVN` = prefix tetap
- `YYYY` = tahun saat ini
- `NNNN` = sequential number (4 digit, zero-padded)

Implementasi: Query booking terakhir di tahun yang sama, increment counter.

---

## 10. Webhook System

### 10.1 Route Registration

Di `src/worker/index.ts`:

```typescript
// Webhook routes (no auth, signature verification)
const webhookRoutes = new Hono<{ Bindings: Env }>();
webhookRoutes.post('/midtrans/notification', midtransWebhookHandler);
app.route('/api/v1/webhooks', webhookRoutes);
```

### 10.2 Signature Verification

```typescript
// SHA-512(order_id + status_code + gross_amount + server_key)
async function verifySignature(data: Record<string, string>, serverKey: string): boolean {
  const raw = `${data.order_id}${data.status_code}${data.gross_amount}${serverKey}`;
  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-512', encoded);
  const computed = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return computed === data.signature_key;
}
```

---

## 11. Response Format & Error Handling

### 11.1 Success Response

```typescript
// GET
return c.json({ success: true, data: result });

// POST/PUT/PATCH
return c.json({ success: true, message: 'Created successfully', data: result }, 201);

// List with pagination
return c.json({
  success: true,
  data: { items: [...], meta: { page, limit, total, totalPages } }
});
```

### 11.2 Error Response

```typescript
// Standard error format
{
  "success": false,
  "message": "Human readable error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Detail error"
  }
}
```

### 11.3 Error Handler Update

File: `src/worker/core/middleware/error-handler.ts`

Perlu diubah untuk menambahkan `success: false` dan `message` di setiap error response.

### 11.4 HTTP Status Codes

| Code | Keterangan |
|------|------------|
| 200 | Sukses |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthorized (API Key / JWT invalid) |
| 403 | Forbidden (insufficient role) |
| 404 | Not found |
| 409 | Conflict (duplicate, already booked) |
| 500 | Internal server error |

---

## 12. Deployment & Cloudflare Setup

### 12.1 Local Development

```bash
# Setup
npm install
cp .dev.vars.example .dev.vars    # Edit JWT_SECRET
npm run db:migrate                # Apply migrations local
npm run db:seed                   # Seed superadmin
npm run build                     # Build FE CMS
npm run dev                       # Start dev server port 8484
```

### 12.2 Production Deployment

```bash
# Set secrets
wrangler secret put JWT_SECRET
wrangler secret put MIDTRANS_SERVER_KEY

# Deploy
npm run deploy
```

### 12.3 `wrangler.toml` Configuration

```toml
name = "savanna-backyard"
main = "./src/worker/index.ts"
compatibility_date = "2025-10-08"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./dist/client"
not_found_handling = "single-page-application"
run_worker_first = ["/api/*"]

[[d1_databases]]
binding = "DB"
database_name = "savanna-backyard-db"
database_id = "5e24783d-8b24-455a-94e2-cbc0480ff8e7"

[vars]
ENVIRONMENT = "production"
ALLOWED_PUBLIC_API_ORIGINS = "https://landingpage-cud.pages.dev"
CORS_ALLOWED_ORIGINS = "https://admin.savannabromo.com"
```

---

## 13. Migration Plan

### Migration File: `migrations/0003_public_api_overhaul.sql`

```sql
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
```

---

## 14. Seed Data

Script: `scripts/seed-public-data.ts`

### Data yang di-seed:

**Vehicles (6):**
| Name | Type | Category | Daily Rate | Specs |
|------|------|----------|------------|-------|
| Honda CRF 150L | TrailBike | 150cc Trail | 200000 | { engine: "149.15 cc", power: "12.4 HP", weight: "122 kg", seat: "865 mm" } |
| Honda CRF 250L | TrailBike | 250cc Trail | 350000 | { engine: "249.6 cc", power: "24.4 HP", weight: "153 kg", seat: "875 mm" } |
| Kawasaki KLX 150 | TrailBike | 150cc Trail | 200000 | { engine: "144 cc", power: "11.5 HP", weight: "114 kg", seat: "830 mm" } |
| Kawasaki KLX 250 | TrailBike | 250cc Trail | 350000 | { engine: "249 cc", power: "23.2 HP", weight: "138 kg", seat: "855 mm" } |
| Yamaha NMAX | StreetBike | 155cc Scooter | 150000 | { engine: "155 cc", power: "15.4 HP", weight: "131 kg", seat: "765 mm" } |
| Toyota Avanza | Car | MPV | 400000 | { engine: "1496 cc", power: "104 HP", weight: "1155 kg", seat: "5 seats" } |

**Packages (4):**
| Name | Price | Duration | Trail |
|------|-------|----------|-------|
| Self-Ride Day | 180000 | 1 day | sea-of-sand |
| Guided Sunrise Tour | 350000 | 1 day | sea-of-sand |
| Multi-Day Adventure | 750000 | 3 days | whispering-savanna |
| Custom Bromo Trip | 0 (contact) | Flexible | null |

**Pricing Tiers (3):**
| Name | Daily | Multi-Day | Highlighted |
|------|-------|-----------|-------------|
| Ride Only | 150000 | 120000 | false |
| Ride + Guide | 250000 | 200000 | true |
| Full Package | 400000 | 350000 | false |

**Reviews (5):**
| Name | Rating | Location |
|------|--------|----------|
| Ahmad Rizki | 5 | Jakarta |
| Sarah Chen | 5 | Singapore |
| Budi Santoso | 4 | Surabaya |
| Lisa Wijaya | 5 | Bandung |
| Tom Miller | 4 | Australia |

**Trails (3):**
| Slug | Name | Difficulty |
|------|------|------------|
| sea-of-sand | Sea of Sand Loop | Moderate |
| whispering-savanna | Whispering Savanna | Easy |
| caldera-rim | Caldera Rim Trail | Hard |

---

## 15. Implementation Order

### Sprint 1 — Database & Core (Hari 1-2)

1. Update Drizzle schema files (vehicles, bookings, leads)
2. Create new schema files (packages, pricing_tiers, reviews, trails)
3. Update schema/index.ts exports
4. Generate migration SQL file
5. Update error handler response format
6. Run migration local
7. Create seed script + run it

### Sprint 2 — Public API Fase 1 (Hari 3-4)

1. Update `GET /public/availability` response format
2. Update `POST /public/bookings` (booking number format, payment columns, Midtrans)
3. Update `POST /public/leads` (new fields)
4. Add `POST /webhooks/midtrans/notification` route
5. Test semua Fase 1 endpoints

### Sprint 3 — Public API Fase 2 (Hari 5-6)

1. Implement `GET /public/vehicles`
2. Implement `GET /public/packages`
3. Implement `GET /public/pricing`
4. Implement `GET /public/reviews`
5. Implement `GET /public/trails` + `GET /public/trails/:trailId`
6. Implement `GET /public/settings`
7. Implement `GET /public/bookings/:bookingNumber/status`

### Sprint 4 — Admin API (Hari 7-8)

1. Create `src/worker/modules/packages/` (routes, service, repository, dto)
2. Create `src/worker/modules/pricing/` (routes, service, repository, dto)
3. Create `src/worker/modules/reviews/` (routes, service, repository, dto)
4. Create `src/worker/modules/trails/` (routes, service, repository, dto)
5. Create settings admin endpoints
6. Create users admin endpoints
7. Register semua routes di `src/worker/index.ts`

### Sprint 5 — CMS Frontend (Hari 9-12)

1. Create packages feature (list, detail, form pages)
2. Create pricing feature (list, detail, form pages)
3. Create reviews feature (list, detail, form pages)
4. Create trails feature (list, detail, form pages)
5. Create settings page
6. Create users page
7. Update sidebar navigation
8. Update router routes

### Sprint 6 — Testing & Polish (Hari 13-14)

1. Test semua Public API endpoints (curl)
2. Test semua Admin API endpoints (curl)
3. Test CMS frontend (browser)
4. Test webhook flow (Midtrans sandbox)
5. Fix bugs
6. Deploy ke Cloudflare

---

## 16. Testing Strategy

### 16.1 Manual API Testing

```bash
# Variables
API_KEY="savanna-dev-api-key-2026"
BASE="http://localhost:8484/api/v1"

# === FASE 1 ===

# Availability
curl -s -H "X-API-Key: $API_KEY" "$BASE/public/availability?startDate=2026-06-01&endDate=2026-06-03" | jq .

# Create Booking
curl -s -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"vehicleId":"VEHICLE_UUID","startDate":"2026-06-01","endDate":"2026-06-03","customerName":"Test","customerPhone":"+6281234567890"}' \
  "$BASE/public/bookings" | jq .

# Submit Lead
curl -s -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Test","phone":"+6281234567890","source":"Website","message":"Test inquiry"}' \
  "$BASE/public/leads" | jq .

# === FASE 2 ===

# Vehicles
curl -s -H "X-API-Key: $API_KEY" "$BASE/public/vehicles" | jq .

# Packages
curl -s -H "X-API-Key: $API_KEY" "$BASE/public/packages" | jq .

# Pricing
curl -s -H "X-API-Key: $API_KEY" "$BASE/public/pricing" | jq .

# Reviews
curl -s -H "X-API-Key: $API_KEY" "$BASE/public/reviews" | jq .

# Trails
curl -s -H "X-API-Key: $API_KEY" "$BASE/public/trails" | jq .
curl -s -H "X-API-Key: $API_KEY" "$BASE/public/trails/sea-of-sand" | jq .

# Settings
curl -s -H "X-API-Key: $API_KEY" "$BASE/public/settings" | jq .

# Booking Status
curl -s -H "X-API-Key: $API_KEY" "$BASE/public/bookings/SVN-2026-0001/status" | jq .

# === ADMIN (JWT Cookie) ===

# Login first
curl -s -c cookies.txt -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@savanna.local","password":"admin123"}' \
  "$BASE/auth/login"

# List packages
curl -s -b cookies.txt "$BASE/packages" | jq .

# Create package
curl -s -b cookies.txt -X POST -H "Content-Type: application/json" \
  -d '{"name":"Test Package","price":100000,"duration":"1 day"}' \
  "$BASE/packages" | jq .
```

### 16.2 Unit Tests

```bash
npm run test:run          # Run all tests
npm run test:auth         # Run auth tests
```

---

## 17. File Structure & Module Map

### 17.1 Backend Module Map

```
src/worker/
├── index.ts                          # UPDATE: tambah webhook route + admin routes baru
├── core/
│   ├── database/
│   │   ├── schema/
│   │   │   ├── index.ts              # UPDATE: export 4 schema baru
│   │   │   ├── users.ts              # EXISTING
│   │   │   ├── customers.ts          # EXISTING
│   │   │   ├── vehicles.ts           # UPDATE: +3 kolom
│   │   │   ├── bookings.ts           # UPDATE: +4 kolom, status enum
│   │   │   ├── leads.ts              # UPDATE: +3 kolom
│   │   │   ├── booking-addons.ts     # EXISTING
│   │   │   ├── payments.ts           # EXISTING
│   │   │   ├── maintenance.ts        # EXISTING
│   │   │   ├── vehicle-status-logs.ts # EXISTING
│   │   │   ├── system-config.ts      # EXISTING
│   │   │   ├── token-blacklist.ts    # EXISTING
│   │   │   ├── packages.ts           # NEW
│   │   │   ├── pricing-tiers.ts      # NEW
│   │   │   ├── reviews.ts            # NEW
│   │   │   └── trails.ts             # NEW
│   │   └── index.ts                  # EXISTING
│   ├── middleware/
│   │   ├── auth.ts                   # EXISTING
│   │   ├── api-key.ts               # EXISTING
│   │   ├── error-handler.ts         # UPDATE: standardize response
│   │   └── validator.ts             # EXISTING
│   ├── repositories/
│   │   ├── config.repository.ts     # EXISTING
│   │   └── statistics.repository.ts # EXISTING
│   ├── services/
│   │   ├── jwt.service.ts           # EXISTING
│   │   └── payment-gateway/         # EXISTING
│   ├── lib/
│   │   └── csv-export.ts            # EXISTING
│   └── types/
│       ├── index.ts                 # EXISTING
│       └── errors.ts                # EXISTING
├── modules/
│   ├── auth/                        # EXISTING
│   ├── customers/                   # EXISTING
│   ├── vehicles/                    # EXISTING
│   ├── leads/                       # EXISTING
│   ├── bookings/                    # EXISTING (UPDATE: booking number format)
│   ├── payments/                    # EXISTING (UPDATE: webhook status mapping)
│   ├── maintenance/                 # EXISTING
│   ├── dashboard/                   # EXISTING
│   ├── reports/                     # EXISTING
│   ├── statistics/                  # EXISTING
│   ├── public-api/                  # UPDATE: +8 endpoints
│   │   ├── public-api.routes.ts
│   │   ├── public-api.service.ts
│   │   ├── public-api.repository.ts
│   │   ├── public-api.dto.ts
│   │   └── public-api.types.ts
│   ├── packages/                    # NEW
│   │   ├── packages.routes.ts
│   │   ├── packages.service.ts
│   │   ├── packages.repository.ts
│   │   └── packages.dto.ts
│   ├── pricing/                     # NEW
│   │   ├── pricing.routes.ts
│   │   ├── pricing.service.ts
│   │   ├── pricing.repository.ts
│   │   └── pricing.dto.ts
│   ├── reviews/                     # NEW
│   │   ├── reviews.routes.ts
│   │   ├── reviews.service.ts
│   │   ├── reviews.repository.ts
│   │   └── reviews.dto.ts
│   ├── trails/                      # NEW
│   │   ├── trails.routes.ts
│   │   ├── trails.service.ts
│   │   ├── trails.repository.ts
│   │   └── trails.dto.ts
│   ├── settings/                    # NEW
│   │   ├── settings.routes.ts
│   │   └── settings.service.ts
│   └── users/                       # NEW
│       ├── users.routes.ts
│       ├── users.service.ts
│       ├── users.repository.ts
│       └── users.dto.ts
```

### 17.2 Frontend Module Map (CMS)

```
src/react-app/
├── main.tsx                         # EXISTING
├── App.tsx                          # EXISTING
├── router/
│   ├── routes.tsx                   # UPDATE: tambah routes baru
│   ├── guards/                      # EXISTING
│   └── layouts/                     # EXISTING
├── features/
│   ├── auth/                        # EXISTING
│   ├── dashboard/                   # EXISTING
│   ├── customers/                   # EXISTING
│   ├── vehicles/                    # EXISTING
│   ├── leads/                       # EXISTING
│   ├── bookings/                    # EXISTING
│   ├── payments/                    # EXISTING
│   ├── maintenance/                 # EXISTING
│   ├── reports/                     # EXISTING
│   ├── shared/                      # EXISTING
│   ├── packages/                    # NEW
│   ├── pricing/                     # NEW
│   ├── reviews/                     # NEW
│   ├── trails/                      # NEW
│   ├── settings/                    # NEW
│   └── users/                       # NEW
├── components/ui/                   # EXISTING (shadcn)
├── hooks/                           # EXISTING
└── lib/
    ├── api-client.ts                # EXISTING
    └── utils.ts                     # EXISTING
```

---

## 18. Environment Variables

### 18.1 `.dev.vars` (Local Development)

```env
JWT_SECRET=savanna-backyard-dev-secret-key-2024
MIDTRANS_SERVER_KEY=Mid-server-lr4rXOoe3sr52y2ueNjMfWaJ
```

### 18.2 `wrangler.toml` [vars]

```toml
[vars]
ENVIRONMENT = "development"
ALLOWED_PUBLIC_API_ORIGINS = "https://landingpage-cud.pages.dev,http://localhost:5173"
CORS_ALLOWED_ORIGINS = "https://landingpage-cud.pages.dev,http://localhost:5173"
MIDTRANS_CLIENT_KEY = "Mid-client-c4p1ertrnxxTEGpr"
MIDTRANS_SERVER_KEY = "Mid-server-lr4rXOoe3sr52y2ueNjMfWaJ"
```

### 18.3 Production Secrets

```bash
wrangler secret put JWT_SECRET
wrangler secret put MIDTRANS_SERVER_KEY
```

### 18.4 FE Landing Page Variables

```env
VITE_API_URL=http://localhost:8484/api/v1
VITE_API_KEY=savanna-dev-api-key-2026
```

---

## 19. Risk & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Midtrans sandbox down | FE tidak bisa test payment | Medium | Sediakan mode `manual` (snapToken=null) |
| Booking number collision | Duplicate number | Low | DB unique constraint + counter-based generation |
| Webhook signature mismatch | Payment tidak verified | Low | Logging + manual verify endpoint di CMS |
| D1 migration break admin | Admin panel error | Medium | Backward compatible changes, test admin setelah migrate |
| Response format inconsistency | FE parsing error | Medium | Centralized response helper |
| Cloudflare Workers cold start | Latency spike | Very Low | Workers minimal cold start |
| D1 row limit (free tier) | Data limit | Low | 5M rows read/day cukup untuk dev |
| CORS blocking | FE tidak bisa call API | Medium | Allow localhost + configured origins |

---

## Appendix A: Complete Endpoint Summary

### Public API (12 endpoints)

| # | Method | Path | Fase | Auth |
|---|--------|------|------|------|
| 1 | GET | `/api/v1/public/availability` | 1 | API Key |
| 2 | POST | `/api/v1/public/bookings` | 1 | API Key |
| 3 | POST | `/api/v1/public/leads` | 1 | API Key |
| 4 | POST | `/api/v1/webhooks/midtrans/notification` | 1 | Signature |
| 5 | GET | `/api/v1/public/vehicles` | 2 | API Key |
| 6 | GET | `/api/v1/public/packages` | 2 | API Key |
| 7 | GET | `/api/v1/public/pricing` | 2 | API Key |
| 8 | GET | `/api/v1/public/reviews` | 2 | API Key |
| 9 | GET | `/api/v1/public/trails` | 2 | API Key |
| 10 | GET | `/api/v1/public/trails/:trailId` | 2 | API Key |
| 11 | GET | `/api/v1/public/settings` | 2 | API Key |
| 12 | GET | `/api/v1/public/bookings/:bookingNumber/status` | 2 | API Key |

### Admin API — Existing (40+ endpoints)

| Module | Count | Auth |
|--------|-------|------|
| Auth | 3 | JWT |
| Customers | 6 | JWT |
| Vehicles | 7 | JWT |
| Leads | 7 | JWT |
| Bookings | 12 | JWT |
| Payments | 8 | JWT |
| Maintenance | 7 | JWT |
| Dashboard | 6 | JWT |
| Reports | 5 | JWT |

### Admin API — NEW (26 endpoints)

| Module | Count | Auth |
|--------|-------|------|
| Packages | 6 | JWT (SUPER_ADMIN for CUD) |
| Pricing | 6 | JWT (SUPER_ADMIN for CUD) |
| Reviews | 6 | JWT (SUPER_ADMIN for delete) |
| Trails | 6 | JWT (SUPER_ADMIN for CUD) |
| Settings | 2 | JWT (SUPER_ADMIN) |

### CMS Frontend — NEW Pages (14 pages)

| Route | Page |
|-------|------|
| `/packages` | Packages list |
| `/packages/:id` | Package detail/edit |
| `/pricing` | Pricing list |
| `/pricing/:id` | Pricing detail/edit |
| `/reviews` | Reviews list |
| `/reviews/:id` | Review detail/edit |
| `/trails` | Trails list |
| `/trails/:id` | Trail detail/edit |
| `/settings` | Settings page |
| `/users` | Users list |

---

**Total scope:**
- **12 Public API** endpoints (untuk FE Landing Page)
- **26 Admin API** endpoints baru (untuk CMS content management)
- **40+ Admin API** endpoints existing (sudah jadi)
- **14 CMS pages** baru
- **4 tabel DB** baru
- **3 tabel DB** dimodifikasi
- **1 migration** file
- **1 seed** script
