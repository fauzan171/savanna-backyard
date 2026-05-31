# SDD: Savanna Bromo Rental - Backend & CMS/Backyard
## Software Design Document

**Tanggal:** 1 Juni 2026
**Versi:** 3.0
**Status:** Ready for Implementation
**Project:** Savanna Bromo Rental - Motor Trail Rental Website
**Referensi FE:** `CONTRACT_API.md`

---

## Daftar Isi

### Phase 1 — Foundation & Content Management
1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack & Cloudflare Services](#3-tech-stack--cloudflare-services)
4. [Database Design](#4-database-design)
5. [Public API (Landing Page)](#5-public-api-landing-page)
6. [Admin API (CMS/Backyard)](#6-admin-api-cmsbackyard)
7. [CMS/Backyard Frontend](#7-cmsbackyard-frontend)
8. [Authentication & Security](#8-authentication--security)
9. [Payment Integration (iFortePay)](#9-payment-integration-ifortepay)
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

### Phase 2 — MVP Operational Features
20. [MVP Phase 2 Overview](#20-mvp-phase-2-overview)
21. [Inspeksi Kendaraan](#21-inspeksi-kendaraan)
22. [Deposit System](#22-deposit-system)
23. [Penalty / Denda](#23-penalty--denda)
24. [Verifikasi KTP/SIM](#24-verifikasi-ktpsim)
25. [Surat Perjanjian Sewa](#25-surat-perjanjian-sewa)
26. [Notifikasi WhatsApp](#26-notifikasi-whatsapp)
27. [MVP Database Schema](#27-mvp-database-schema)
28. [MVP API Endpoints](#28-mvp-api-endpoints)
29. [MVP CMS Frontend](#29-mvp-cms-frontend)
30. [End-to-End Business Flow](#30-end-to-end-business-flow)
31. [MVP Implementation Order](#31-mvp-implementation-order)

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

### 21.1 High-Level Architecture

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

### 21.2 Request Flow

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

### 22.1 Tech Stack

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

### 22.2 Cloudflare Services

| Service | Penggunaan | Konfigurasi |
|---------|------------|-------------|
| **Workers** | Runtime BE + serve CMS SPA | `wrangler.toml` → `main = "./src/worker/index.ts"` |
| **D1** | Database SQLite | `wrangler.toml` → `[[d1_databases]]` binding `DB` |
| **Workers Assets** | Serve CMS static files | `wrangler.toml` → `[assets] directory = "./dist/client"` |
| **Wrangler** | CLI dev + deploy | `npm run dev` (local), `npm run deploy` (production) |

### 22.3 Kenapa Semua di Cloudflare?

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

### 23.1 Entity Relationship Diagram

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

### 23.2 Tabel Existing yang Dimodifikasi

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

### 23.3 Tabel Baru

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

### 23.4 System Configuration Keys (Settings)

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

### 24.1 FASE 1 — Urgent

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

### 24.2 FASE 2 — Data Dinamis

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

### 25.1 Existing Admin Endpoints (Tidak Berubah)

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

### 25.2 Admin Endpoints BARU (Content Management)

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

### 26.1 Halaman Existing (Tidak Berubah)

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

### 26.2 Halaman BARU yang Perlu Dibuat

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

### 26.3 Sidebar Navigation Update

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

### 26.4 File Structure untuk CMS Frontend

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

### 27.1 Admin Auth (JWT)

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

### 27.2 Public API Auth (API Key)

```
Every Public Request:
1. Header: X-API-Key: <key>
2. API Key middleware check system_configuration table
3. Key: public_api_enabled = true
4. Key: public_api_key = <key>
5. If valid → continue, else → 401
```

### 27.3 Security Headers

```typescript
// Already implemented in src/worker/index.ts
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000 (production only)
```

### 27.4 CORS Configuration

| Context | Allowed Origins | Credentials |
|---------|----------------|-------------|
| Admin API | `CORS_ALLOWED_ORIGINS` env var | `true` (cookies) |
| Public API | `ALLOWED_PUBLIC_API_ORIGINS` env var | `false` |
| Webhooks | All (Midtrans server) | `false` |

---

## 9. Payment Integration (Midtrans)

### 28.1 Midtrans Snap Flow

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

### 28.2 Environment

| Env | Snap URL | Server Key |
|-----|----------|------------|
| Sandbox | `https://app.sandbox.midtrans.com/snap/v1/transactions` | `Mid-server-lr4rXOoe3sr52y2ueNjMfWaJ` |
| Production | `https://app.midtrans.com/snap/v1/transactions` | Set via `wrangler secret put` |

### 28.3 Booking Number Format

Format: `SVN-YYYY-NNNN`
- `SVN` = prefix tetap
- `YYYY` = tahun saat ini
- `NNNN` = sequential number (4 digit, zero-padded)

Implementasi: Query booking terakhir di tahun yang sama, increment counter.

---

## 10. Webhook System

### 29.1 Route Registration

Di `src/worker/index.ts`:

```typescript
// Webhook routes (no auth, signature verification)
const webhookRoutes = new Hono<{ Bindings: Env }>();
webhookRoutes.post('/midtrans/notification', midtransWebhookHandler);
app.route('/api/v1/webhooks', webhookRoutes);
```

### 29.2 Signature Verification

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

### 30.1 Success Response

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

### 30.2 Error Response

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

### 30.3 Error Handler Update

File: `src/worker/core/middleware/error-handler.ts`

Perlu diubah untuk menambahkan `success: false` dan `message` di setiap error response.

### 30.4 HTTP Status Codes

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

### 31.1 Local Development

```bash
# Setup
npm install
cp .dev.vars.example .dev.vars    # Edit JWT_SECRET
npm run db:migrate                # Apply migrations local
npm run db:seed                   # Seed superadmin
npm run build                     # Build FE CMS
npm run dev                       # Start dev server port 8484
```

### 31.2 Production Deployment

```bash
# Set secrets
wrangler secret put JWT_SECRET
wrangler secret put MIDTRANS_SERVER_KEY

# Deploy
npm run deploy
```

### 31.3 `wrangler.toml` Configuration

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
| Masalah | Solusi |
|---------|--------|
| Tidak ada dokumentasi kondisi kendaraan sebelum & sesudah rental | Inspeksi Kendaraan dengan foto + checklist |
| Deposit tidak tertrack, refund manual | Deposit System otomatis |
| Kerusakan, telat, BBM kurang tidak bisa di-charge | Penalty Management |
| Customer tidak terverifikasi identitasnya | Verifikasi KTP/SIM |
| Tidak ada surat perjanjian resmi | Contract Generator + Digital Signature |
| Tidak ada notifikasi ke customer | WhatsApp Notification |

### Booking Lifecycle (Updated)

```
Lead → Booking → Payment → Inspeksi Pre-Rental → Kontrak TTD → Rental Start
                                                                          │
                                                                  Rental Period
                                                                          │
Return → Inspeksi Post-Rental → Compare → Penalty (jika ada) → Deposit Refund → Complete
```

---

## 21. Inspeksi Kendaraan

### 21.1 Deskripsi

Staff mendokumentasikan kondisi kendaraan sebelum diserahkan ke customer (pre-rental) dan setelah dikembalikan (post-rental). Setiap inspeksi mencakup checklist kondisi, foto dokumentasi, KM, dan level BBM.

### 21.2 Tipe Inspeksi

| Tipe | Kapan | Siapa | Tujuan |
|------|-------|-------|--------|
| `pre_rental` | Sebelum kendaraan diserahkan | Staff | Dokumentasi kondisi awal |
| `post_rental` | Setelah kendaraan dikembalikan | Staff | Bandingkan dengan kondisi awal |

### 21.3 Checklist Kategori

Setiap inspeksi punya checklist item per kategori:

| Kategori | Item yang Dicek |
|----------|-----------------|
| **Body** | Tangki, knalpot, spion, jok, fairing, fender, swing arm |
| **Rem** | Rem depan, rem belakang |
| **Ban** | Ban depan (tekanan & kondisi), ban belakang |
| **Mesin** | Starter, mesin idle, rantai/kampas, kopling |
| **Listrik** | lampu depan, lampu belakang, sein, klakson, speedometer |
| **Lainnya** | Kunci, STNK, helm, tool kit |

### 21.4 Kondisi Item

| Kondisi | Warna | Arti |
|---------|-------|------|
| `good` | Hijau | Tidak ada masalah |
| `light_damage` | Kuning | Baret kecil, lecet — tidak mempengaruhi fungsi |
| `moderate_damage` | Orange | Penyok, retak — perlu perhatian tapi masih bisa dipakai |
| `severe_damage` | Merah | Rusak, tidak berfungsi — harus diperbaiki sebelum rental |

### 21.5 Foto Dokumentasi

Setiap inspeksi wajib punya minimal 4 foto:
1. Sisi depan
2. Sisi belakang
3. Sisi kanan
4. Sisi kiri

Plus foto detail untuk setiap item yang tidak `good`.

### 21.6 Data yang Dicatat

| Field | Pre-Rental | Post-Rental |
|-------|-----------|-------------|
| Kilometer (KM) | Wajib | Wajib |
| Level BBM (`full`, `3/4`, `1/2`, `1/4`, `empty`) | Wajib | Wajib |
| Checklist kondisi per item | Wajib | Wajib |
| Foto 4 sisi | Wajib | Wajib |
| Catatan umum | Opsional | Opsional |

### 21.7 Comparison

Saat post-rental selesai, system otomatis membandingkan dengan pre-rental:
- Item yang berubah kondisi (misal pre: `good` → post: `moderate_damage`) di-flag sebagai **new damage**
- KM bertambah dihitung
- BBM berkurang dihitung
- Flag otomatis masuk ke Penalty jika ada kerusakan baru

---

## 22. Deposit System

### 22.1 Deskripsi

Customer membayar deposit (jaminan) sebelum rental dimulai. Deposit di-hold dan hanya dikembalikan setelah post-rental inspection selesai dan tidak ada masalah.

### 22.2 Alur Deposit

```
Booking Confirmed → Deposit Collected (cash/transfer) → Hold
                                                            │
                                          Post-Inspection Complete
                                                            │
                                              ┌─────────────┼──────────────┐
                                              │             │              │
                                        Kondisi OK    Ada Kerusakan   Telat Kembali
                                              │             │              │
                                        Full Refund   Potong dari      Potong dari
                                                      deposit          deposit
                                              │             │              │
                                              └─────────────┼──────────────┘
                                                            │
                                                      Settled
```

### 22.3 Deposit Amount

- Default: Rp 500.000 (configurable di Settings)
- Bisa override per booking
- Dicatat terpisah dari rental payment

### 22.4 Status Deposit

| Status | Arti |
|--------|------|
| `collected` | Deposit sudah diterima dari customer |
| `partially_refunded` | Sebagian dikembalikan (ada potongan) |
| `fully_refunded` | Seluruhnya dikembalikan |
| `forfeited` | Deposit tidak dikembalikan (kerusakan parah) |

### 22.5 Deduction

Setiap potongan deposit dicatat:

| Field | Contoh |
|-------|--------|
| Tipe | `damage`, `fuel_shortage`, `late_fee`, `other` |
| Deskripsi | "Baret tangki sisi kiri" |
| Amount | Rp 150.000 |

### 22.6 Perhitungan Settlement

```
Total Deposit:     Rp 500.000
Deductions:
  - Baret tangki:  Rp 150.000
  - BBM kurang:     Rp 50.000
Total Deductions:  Rp 200.000
Refund Amount:     Rp 300.000
```

---

## 23. Penalty / Denda

### 23.1 Deskripsi

System untuk mencatat dan menghitung denda terhadap customer berdasarkan hasil post-rental inspection, keterlambatan pengembalian, dan violation lainnya.

### 23.2 Tipe Penalty

| Tipe | Trigger | Kalkulasi |
|------|---------|-----------|
| `late_return` | Kendaraan dikembalikan lewat endDate | `(jumlah hari telat) × (daily_rate × 1.5)` |
| `damage` | Kerusakan baru terdeteksi di post-inspection | Diisi manual oleh staff berdasarkan estimasi perbaikan |
| `fuel_shortage` | BBM post-rental < BBM pre-rental | `(litra kurang) × (harga BBM per liter)` |
| `traffic_violation` | Customer kena tilang pas rental | Diisi manual sesuai nilai tilang |
| `other` | Lainnya | Diisi manual |

### 23.3 Status Penalty

| Status | Arti |
|--------|------|
| `pending` | Baru dicatat, belum di-charge |
| `charged` | Sudah dibayar / dipotong dari deposit |
| `waived` | Dihapus / dimaafkan oleh admin |
| `disputed` | Customer menolak / dispute |

### 23.4 Auto-Detection

System otomatis mendeteksi dan mengusulkan penalty:

| Deteksi Otomatis | Dari |
|-------------------|------|
| Telat kembali | `actualReturnDate > endDate` pada booking |
| Kerusakan baru | Comparison pre vs post inspection |
| BBM kurang | `fuelLevel post < fuelLevel pre` |

Staff bisa accept, modify, atau reject setiap proposed penalty.

### 23.5 Relasi dengan Deposit

Penalty bisa dibayar dari:
1. **Potong deposit** — otomatis saat settlement
2. **Pembayaran terpisah** — customer bayar cash/transfer tambahan
3. **Waived** — admin memaafkan

---

## 24. Verifikasi KTP/SIM/SIM

### 24.1 Deskripsi

Sebelum rental dimulai, customer wajib menyerahkan fotokopi/ foto KTP dan SIM (sesuai jenis kendaraan). Data ini disimpan di system untuk keamanan dan kebutuhan hukum.

### 24.2 Tipe Dokumen

| Tipe | Keterangan |
|------|------------|
| `ktp` | Kartu Tanda Penduduk — wajib untuk semua rental |
| `sim_a` | SIM A — untuk rental mobil |
| `sim_c` | SIM C — untuk rental motor |

### 24.3 Alur Verifikasi

```
Customer Datang → Staff foto KTP/SIM → Upload ke System
                                              │
                                    Staff cek keaslian
                                              │
                                    ┌─────────┼─────────┐
                                    │                   │
                                  Valid              Tidak Valid
                                    │                   │
                              isVerified: true    Reject + Catat alasan
                                    │
                              Customer boleh lanjut rental
```

### 24.4 Data yang Disimpan

| Field | Keterangan |
|-------|------------|
| Tipe dokumen | KTP / SIM A / SIM C |
| Nomor dokumen | NIK (KTP) atau nomor SIM |
| Foto dokumen | URL gambar |
| Status verifikasi | `pending` / `verified` / `rejected` |
| Diverifikasi oleh | Staff ID |
| Tanggal verifikasi | Timestamp |

### 24.5 Aturan

- KTP wajib untuk semua rental
- SIM C wajib untuk rental motor
- SIM A wajib untuk rental mobil
- Customer yang sudah pernah verified tidak perlu upload ulang (tapi bisa diminta lagi jika dokumen sudah lama)
- Jika dokumen rejected, booking tidak bisa di-start

---

## 25. Surat Perjanjian Sewa Sewa

### 25.1 Deskripsi

Generate surat perjanjian sewa (rental agreement) otomatis dari data booking. Kontrak berisi data penyewa, data kendaraan, jangka waktu, biaya, syarat & ketentuan. Ditandatangani secara digital oleh customer dan staff.

### 25.2 Isi Kontrak

| Bagian | Isi |
|--------|-----|
| **Header** | Logo, nama perusahaan, alamat |
| **Pihak 1 (Penyewa)** | Nama, KTP, alamat, telepon |
| **Pihak 2 (Pemilik)** | Nama perusahaan, alamat |
| **Objek Sewa** | Jenis kendaraan, nomor polisi, warna |
| **Jangka Waktu** | Tanggal mulai - tanggal selesai |
| **Biaya** | Tarif harian, total, deposit |
| **Syarat & Ketentuan** | Template T&C (editable di settings) |
| **Tanda Tangan** | Customer + Staff |

### 25.3 Alur Kontrak

```
Booking Confirmed → Documents Verified → Generate Contract (auto-fill data)
                                                       │
                                              Tampilkan ke customer
                                                       │
                                    ┌──────────────────┼──────────────────┐
                                    │                                     │
                            Customer TTD Digital                  Customer TTD Kertas
                            (tablet/screen capture)               (scan/upload foto)
                                    │                                     │
                                    └──────────────┬──────────────────────┘
                                                   │
                                           Staff TTD
                                                   │
                                          Contract Signed
                                                   │
                                        Rental bisa Start
```

### 25.4 Status Kontrak

| Status | Arti |
|--------|------|
| `draft` | Digenerate tapi belum ditandatangani |
| `customer_signed` | Customer sudah tanda tangan |
| `signed` | Kedua pihak sudah tanda tangan |
| `completed` | Rental selesai, kontrak closed |

### 25.5 Template Syarat & Ketentuan

Default T&C (bisa diedit di Settings):

> 1. Penyewa bertanggung jawab penuh atas kendaraan selama masa sewa
> 2. Kendaraan harus dikembalikan dalam kondisi yang sama seperti saat diserahkan
> 3. Pengembalian melebihi batas waktu dikenakan denda sesuai ketentuan
> 4. Penyewa wajib mengembalikan BBM dalam kondisi sama seperti saat pengambilan
> 5. Kerusakan yang terjadi selama masa sewa menjadi tanggung jawab penyewa
> 6. Penyewa wajib mematuhi peraturan lalu lintas yang berlaku
> 7. Deposit dikembalikan setelah pemeriksaan kondisi kendaraan
> 8. Kendaraan tidak boleh dipinjamkan kepada pihak lain tanpa izin
> 9. Sewa dibatalkan jika dokumen tidak valid atau tidak lengkap
> 10. Segala sengketa akan diselesaikan secara musyawarah

---

## 26. Notifikasi WhatsApp

### 26.1 Deskripsi

System mengirim notifikasi otomatis ke customer via WhatsApp pada event-event tertentu. Menggunakan WhatsApp Business API atau provider pihak ketiga (Fonnte, Wablas, dll).

### 26.2 Event & Template

| Event | Trigger | Template Key |
|-------|---------|-------------|
| Booking Confirmed | Booking status → `Confirmed` | `booking_confirmed` |
| Payment Received | Payment status → `Verified` | `payment_received` |
| Rental Reminder | H-1 sebelum startDate | `rental_reminder` |
| Rental Started | Booking status → `Active` | `rental_started` |
| Rental Overdue | Melewati endDate, status masih `Active` | `rental_overdue` |
| Return Confirmed | Booking status → `Completed` | `return_confirmed` |
| Deposit Refund | Deposit status → `fully_refunded` / `partially_refunded` | `deposit_refund` |
| Penalty Charged | Penalty status → `charged` | `penalty_charged` |

### 26.3 Template Pesan

**`booking_confirmed`:**
```
Halo {customer_name}! 🏍️
Booking Anda telah dikonfirmasi.

📋 Detail Booking:
No: {booking_number}
Kendaraan: {vehicle_name}
Tanggal: {start_date} - {end_date}
Total: Rp {total_amount}

Mohon datang ke lokasi kami pada tanggal {start_date} dengan membawa KTP dan SIM asli.

Terima kasih! - Savanna Bromo Rental
```

**`payment_received`:**
```
Halo {customer_name}! ✅
Pembayaran Anda telah kami terima.

No Booking: {booking_number}
Jumlah: Rp {amount}
Metode: {payment_method}

Status booking Anda: CONFIRMED.

Terima kasih! - Savanna Bromo Rental
```

**`rental_reminder`:**
```
Halo {customer_name}! ⏰
Reminder: Rental Anda dimulai BESOK.

📋 Detail:
Kendaraan: {vehicle_name}
Tanggal ambil: {start_date}

Jangan lupa bawa KTP & SIM asli ya!

Savanna Bromo Rental
```

**`rental_overdue`:**
```
Halo {customer_name}! ⚠️
Kendaraan yang Anda sewa belum dikembalikan.

No Booking: {booking_number}
Batas pengembalian: {end_date}
Denda keterlambatan: Rp {daily_rate} × 1.5 per hari

Mohon segera kembalikan kendaraan ke lokasi kami.

Savanna Bromo Rental
```

**`deposit_refund`:**
```
Halo {customer_name}! 💰
Deposit Anda telah diproses.

No Booking: {booking_number}
Deposit: Rp {deposit_amount}
Potongan: Rp {deduction_amount}
Refund: Rp {refund_amount}

Terima kasih telah menyewa di Savanna Bromo Rental! 🙏
```

### 26.4 Provider Integration

Menggunakan REST API call ke WhatsApp provider. Contoh dengan Fonnte:

```
POST https://api.fonnte.com/send
Headers: Authorization: {api_key}
Body: {
  "target": "6281234567890",
  "message": "template content...",
  "countryCode": "62"
}
```

### 26.5 Auto vs Manual

| Mode | Kapan |
|------|-------|
| **Auto** | Booking confirmed, payment received, overdue |
| **Manual** | Staff klik "Send Reminder", custom message |

### 26.6 Notification Log

Setiap pengiriman dicatat:
- Recipient, template, data
- Status: pending / sent / failed
- External ID (dari provider)
- Error message (jika gagal)
- Timestamp

---

## 27. MVP Database Schema

### 27.1 Tabel Baru

#### `vehicle_inspections`

```sql
CREATE TABLE vehicle_inspections (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  type TEXT NOT NULL CHECK(type IN ('pre_rental', 'post_rental')),
  inspector_id TEXT REFERENCES users(id),
  odometer_km REAL,
  fuel_level TEXT CHECK(fuel_level IN ('full', 'three_quarter', 'half', 'quarter', 'empty')),
  overall_condition TEXT CHECK(overall_condition IN ('excellent', 'good', 'fair', 'poor')),
  checklist TEXT NOT NULL DEFAULT '[]',   -- JSON: [{category, item, condition, description, photoUrl}]
  photos TEXT NOT NULL DEFAULT '[]',      -- JSON: [{label, url}]
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'completed')),
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_inspections_booking ON vehicle_inspections(booking_id);
CREATE INDEX idx_inspections_type ON vehicle_inspections(type);
```

**Checklist JSON format:**
```json
[
  {
    "category": "body",
    "item": "Tangki bensin",
    "condition": "good",
    "description": null,
    "photoUrl": null
  },
  {
    "category": "body",
    "item": "Knalpot",
    "condition": "light_damage",
    "description": "Baret kecil sisi kanan",
    "photoUrl": "/uploads/inspection/baret_knalpot.jpg"
  }
]
```

**Photos JSON format:**
```json
[
  { "label": "Depan", "url": "/uploads/inspection/pre_front.jpg" },
  { "label": "Belakang", "url": "/uploads/inspection/pre_rear.jpg" },
  { "label": "Kanan", "url": "/uploads/inspection/pre_right.jpg" },
  { "label": "Kiri", "url": "/uploads/inspection/pre_left.jpg" }
]
```

#### `customer_documents`

```sql
CREATE TABLE customer_documents (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  document_type TEXT NOT NULL CHECK(document_type IN ('ktp', 'sim_a', 'sim_c')),
  document_number TEXT,
  photo_url TEXT,
  is_verified INTEGER NOT NULL DEFAULT 0,
  verified_by TEXT REFERENCES users(id),
  verified_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_documents_customer ON customer_documents(customer_id);
CREATE INDEX idx_documents_type ON customer_documents(document_type);
```

#### `booking_deposits`

```sql
CREATE TABLE booking_deposits (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'collected' CHECK(status IN ('collected', 'partially_refunded', 'fully_refunded', 'forfeited')),
  deductions TEXT DEFAULT '[]',           -- JSON: [{type, description, amount}]
  refunded_amount REAL DEFAULT 0,
  refunded_at TEXT,
  collected_by TEXT REFERENCES users(id),
  processed_by TEXT REFERENCES users(id),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_deposits_booking ON booking_deposits(booking_id);
```

**Deductions JSON format:**
```json
[
  { "type": "damage", "description": "Baret tangki sisi kiri", "amount": 150000 },
  { "type": "fuel_shortage", "description": "BBM kurang 3 liter", "amount": 45000 }
]
```

#### `booking_penalties`

```sql
CREATE TABLE booking_penalties (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  type TEXT NOT NULL CHECK(type IN ('late_return', 'damage', 'fuel_shortage', 'traffic_violation', 'other')),
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'charged', 'waived', 'disputed')),
  source TEXT CHECK(source IN ('auto_detected', 'manual')),
  waived_by TEXT REFERENCES users(id),
  waived_at TEXT,
  waived_reason TEXT,
  charged_from TEXT CHECK(charged_from IN ('deposit', 'separate_payment')),
  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_penalties_booking ON booking_penalties(booking_id);
CREATE INDEX idx_penalties_status ON booking_penalties(status);
```

#### `rental_contracts`

```sql
CREATE TABLE rental_contracts (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  contract_number TEXT NOT NULL UNIQUE,
  terms_and_conditions TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_id_number TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  vehicle_name TEXT NOT NULL,
  vehicle_plate TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  daily_rate REAL NOT NULL,
  total_amount REAL NOT NULL,
  deposit_amount REAL DEFAULT 0,
  customer_signature TEXT,               -- base64 atau URL gambar tanda tangan
  staff_signature TEXT,
  customer_signed_at TEXT,
  staff_signed_at TEXT,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'customer_signed', 'signed', 'completed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_contracts_booking ON rental_contracts(booking_id);
```

#### `notification_logs`

```sql
CREATE TABLE notification_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'whatsapp' CHECK(type IN ('whatsapp', 'sms', 'email')),
  recipient TEXT NOT NULL,
  template_key TEXT NOT NULL,
  booking_id TEXT REFERENCES bookings(id),
  message TEXT NOT NULL,
  data TEXT,                              -- JSON: template variables
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
  external_id TEXT,
  sent_at TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_notifications_booking ON notification_logs(booking_id);
CREATE INDEX idx_notifications_status ON notification_logs(status);
```

### 27.2 Modifikasi Tabel Existing

#### `bookings` — Tambah kolom

```sql
ALTER TABLE bookings ADD COLUMN payment_page_url TEXT;
-- Note: payment_page_url already added in migration 0004

-- New columns needed:
ALTER TABLE bookings ADD COLUMN fuel_level_start TEXT CHECK(fuel_level_start IN ('full', 'three_quarter', 'half', 'quarter', 'empty'));
ALTER TABLE bookings ADD COLUMN fuel_level_end TEXT CHECK(fuel_level_end IN ('full', 'three_quarter', 'half', 'quarter', 'empty'));
```

### 27.3 System Configuration Keys (Baru)

| Key | Value Default | Keterangan |
|-----|---------------|------------|
| `deposit_amount` | `500000` | Sudah ada |
| `late_return_penalty_rate` | `1.5` | Pengali daily rate untuk denda telat per hari |
| `fuel_price_per_liter` | `16500` | Harga BBM per liter untuk kalkulasi kekurangan BBM |
| `rental_terms_and_conditions` | *(template default)* | Syarat & ketentuan default untuk kontrak |
| `whatsapp_api_url` | *(kosong)* | URL endpoint WhatsApp provider |
| `whatsapp_api_key` | *(kosong)* | API key WhatsApp provider |
| `contract_company_name` | `Savanna Bromo Rental` | Nama perusahaan untuk kontrak |
| `contract_company_address` | `Malang, East Java, Indonesia` | Alamat untuk kontrak |

### 27.4 Entity Relationship Diagram (Updated)

```
users ─────────────────────────────────────────────────────────────┐
  │                                                                 │
  ▼                                                                 │
customers ──┐    vehicles ──┐                                       │
            │               │                                       │
            ▼               ▼                                       │
        bookings ──────► booking_addons                             │
          │ │ │                                                   │
          │ │ └──► booking_deposits                               │
          │ │                                                     │
          │ └────► booking_penalties                              │
          │                                                       │
          └──────► vehicle_inspections (pre + post)               │
          │                                                       │
          └──────► rental_contracts                               │
          │                                                       │
          └──────► notification_logs                              │
                                                                  │
customers ──► customer_documents (KTP/SIM)                        │
                                                                  │
system_configuration ─────────────────────────────────────────────┘
```

---

## 28. MVP API Endpoints

### 28.1 Inspeksi Kendaraan

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/v1/bookings/:id/inspections` | Buat inspeksi baru (pre atau post) |
| `GET` | `/api/v1/bookings/:id/inspections` | List inspeksi untuk booking |
| `GET` | `/api/v1/bookings/:id/inspections/:inspectionId` | Detail inspeksi |
| `PATCH` | `/api/v1/bookings/:id/inspections/:inspectionId` | Update inspeksi (draft) |
| `POST` | `/api/v1/bookings/:id/inspections/:inspectionId/complete` | Finalisasi inspeksi |
| `GET` | `/api/v1/bookings/:id/inspections/compare` | Compare pre vs post rental |

**POST /bookings/:id/inspections — Request:**
```json
{
  "type": "pre_rental",
  "odometerKm": 12500,
  "fuelLevel": "full",
  "checklist": [
    { "category": "body", "item": "Tangki bensin", "condition": "good" },
    { "category": "body", "item": "Knalpot", "condition": "light_damage", "description": "Baret kecil" }
  ],
  "photos": [
    { "label": "Depan", "url": "/uploads/insp_001_front.jpg" },
    { "label": "Kanan", "url": "/uploads/insp_001_right.jpg" },
    { "label": "Belakang", "url": "/uploads/insp_001_rear.jpg" },
    { "label": "Kiri", "url": "/uploads/insp_001_left.jpg" }
  ],
  "notes": "Kondisi keseluruhan baik"
}
```

**GET /bookings/:id/inspections/compare — Response:**
```json
{
  "success": true,
  "data": {
    "preInspection": { "id": "...", "odometerKm": 12500, "fuelLevel": "full" },
    "postInspection": { "id": "...", "odometerKm": 12780, "fuelLevel": "half" },
    "changes": {
      "kmDiff": 280,
      "fuelDiff": "half",
      "newDamages": [
        { "category": "body", "item": "Tangki bensin", "preCondition": "good", "postCondition": "moderate_damage", "description": "Penyok sisi kiri" }
      ],
      "totalNewDamages": 1
    },
    "suggestedPenalties": [
      { "type": "fuel_shortage", "description": "BBM berkurang setengah tangki (~3 liter)", "estimatedAmount": 49500 },
      { "type": "damage", "description": "Penyok tangki sisi kiri", "estimatedAmount": null }
    ]
  }
}
```

### 28.2 Deposit

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/v1/bookings/:id/deposit` | Catat penerimaan deposit |
| `GET` | `/api/v1/bookings/:id/deposit` | Lihat status deposit |
| `POST` | `/api/v1/bookings/:id/deposit/refund` | Proses refund deposit |
| `POST` | `/api/v1/bookings/:id/deposit/deduction` | Tambah potongan deposit |

**POST /bookings/:id/deposit — Request:**
```json
{
  "amount": 500000,
  "notes": "Cash diterima dari customer"
}
```

**POST /bookings/:id/deposit/refund — Request:**
```json
{
  "deductions": [
    { "type": "damage", "description": "Baret tangki", "amount": 150000 },
    { "type": "fuel_shortage", "description": "BBM kurang", "amount": 50000 }
  ],
  "notes": "Potongan kerusakan + BBM"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "bookingId": "uuid",
    "amount": 500000,
    "deductions": [
      { "type": "damage", "description": "Baret tangki", "amount": 150000 },
      { "type": "fuel_shortage", "description": "BBM kurang", "amount": 50000 }
    ],
    "totalDeductions": 200000,
    "refundedAmount": 300000,
    "status": "partially_refunded"
  }
}
```

### 28.3 Penalty

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/v1/bookings/:id/penalties` | Buat penalty baru |
| `GET` | `/api/v1/bookings/:id/penalties` | List penalty untuk booking |
| `PATCH` | `/api/v1/bookings/:id/penalties/:penaltyId` | Update penalty |
| `POST` | `/api/v1/bookings/:id/penalties/:penaltyId/waive` | Waive (hapus) penalty |
| `POST` | `/api/v1/bookings/:id/penalties/auto-detect` | Auto-detect penalties dari inspection |

**POST /bookings/:id/penalties — Request:**
```json
{
  "type": "damage",
  "description": "Penyok tangki bensin sisi kiri",
  "amount": 200000
}
```

**POST /bookings/:id/penalties/auto-detect — Response:**
```json
{
  "success": true,
  "data": {
    "detected": [
      {
        "type": "late_return",
        "description": "Terlambat 1 hari",
        "amount": 300000,
        "source": "auto_detected",
        "evidence": { "endDate": "2026-06-05", "actualReturnDate": "2026-06-06" }
      },
      {
        "type": "fuel_shortage",
        "description": "BBM berkurang dari full ke half (~3 liter)",
        "amount": 49500,
        "source": "auto_detected",
        "evidence": { "preFuelLevel": "full", "postFuelLevel": "half" }
      },
      {
        "type": "damage",
        "description": "Penyok tangki sisi kiri",
        "amount": null,
        "source": "auto_detected",
        "evidence": { "preCondition": "good", "postCondition": "moderate_damage" }
      }
    ]
  }
}
```

### 28.4 Customer Documents (KTP/SIM)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/v1/customers/:id/documents` | Upload dokumen KTP/SIM |
| `GET` | `/api/v1/customers/:id/documents` | List dokumen customer |
| `PATCH` | `/api/v1/customers/:id/documents/:documentId/verify` | Verify / reject dokumen |
| `DELETE` | `/api/v1/customers/:id/documents/:documentId` | Hapus dokumen |

**POST /customers/:id/documents — Request:**
```json
{
  "documentType": "ktp",
  "documentNumber": "3507123456780001",
  "photoUrl": "/uploads/docs/ktp_ahmad.jpg"
}
```

**PATCH /customers/:id/documents/:documentId/verify — Request:**
```json
{
  "action": "verify"
}
```
atau:
```json
{
  "action": "reject",
  "rejectionReason": "Foto tidak jelas, mohon upload ulang"
}
```

### 28.5 Rental Contract

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/v1/bookings/:id/contract` | Generate kontrak baru |
| `GET` | `/api/v1/bookings/:id/contract` | Lihat kontrak |
| `POST` | `/api/v1/bookings/:id/contract/sign` | Tanda tangan kontrak |
| `GET` | `/api/v1/bookings/:id/contract/pdf` | Download PDF |

**POST /bookings/:id/contract — Request:**
```json
{
  "termsAndConditions": "(optional, kalau kosong pakai default dari settings)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "contractNumber": "CTR-2026-0001",
    "status": "draft",
    "customerName": "Ahmad Rizki",
    "customerIdNumber": "3507123456780001",
    "vehicleName": "Honda CRF 150L",
    "vehiclePlate": "B 1234 SV",
    "startDate": "2026-06-01",
    "endDate": "2026-06-03",
    "dailyRate": 200000,
    "totalAmount": 400000,
    "depositAmount": 500000,
    "termsAndConditions": "...",
    "customerSignature": null,
    "staffSignature": null
  }
}
```

**POST /bookings/:id/contract/sign — Request:**
```json
{
  "party": "customer",
  "signature": "data:image/png;base64,iVBOR..."
}
```
atau:
```json
{
  "party": "staff",
  "signature": "data:image/png;base64,iVBOR..."
}
```

### 28.6 Notifications

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/v1/notifications/send` | Kirim notifikasi manual |
| `GET` | `/api/v1/notifications/logs` | List notification logs |
| `GET` | `/api/v1/notifications/templates` | List template yang tersedia |
| `POST` | `/api/v1/notifications/test` | Test kirim ke nomor tertentu |
| `PATCH` | `/api/v1/settings` | Update WhatsApp config (sudah ada) |

**POST /notifications/send — Request:**
```json
{
  "recipient": "6281234567890",
  "templateKey": "rental_reminder",
  "bookingId": "uuid",
  "customMessage": "(optional, override template)"
}
```

**GET /notifications/logs?status=sent&limit=20 — Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "whatsapp",
      "recipient": "6281234567890",
      "templateKey": "booking_confirmed",
      "status": "sent",
      "sentAt": "2026-06-01T10:00:00Z",
      "bookingId": "uuid"
    }
  ]
}
```

---

## 29. MVP CMS Frontend

### 29.1 Halaman Baru

| Halaman | Path | Deskripsi |
|---------|------|-----------|
| Booking Inspection | `/bookings/:id/inspection` | Form inspeksi pre/post rental dengan checklist + upload foto |
| Inspection Compare | `/bookings/:id/inspection/compare` | Side-by-side pre vs post |
| Deposit Management | Dalam booking detail tab | Tab deposit di halaman booking detail |
| Penalty Management | Dalam booking detail tab | Tab penalties di halaman booking detail |
| Customer Documents | `/customers/:id` section | Section upload & verifikasi KTP/SIM |
| Contract View | `/bookings/:id/contract` | Preview kontrak + signature pad |
| Notification Logs | `/notifications` | List log notifikasi + kirim manual |
| Notification Settings | Dalam Settings | Config WhatsApp API |

### 29.2 Modifikasi Halaman Existing

| Halaman | Perubahan |
|---------|-----------|
| **Booking Detail** | Tambah tab: Inspection, Deposit, Penalties, Contract |
| **Booking List** | Tambah kolom: Deposit status, Penalty count |
| **Booking Workflow** | Pre-inspection wajib sebelum Start; Post-inspection wajib sebelum Complete |
| **Customer Detail** | Tambah section: Documents (KTP/SIM) |
| **Settings** | Tambah section: WhatsApp config, Contract T&C, Penalty rates |

### 29.3 Booking Workflow (Updated)

Status transitions yang baru:

```
Pending → pending_payment → Confirmed → [Pre-Inspection] → [Contract Signed] → Active → [Post-Inspection] → [Penalties Settled] → [Deposit Refunded] → Completed
```

Guards:
- **Confirmed → Active**: Requires completed pre-rental inspection + signed contract + verified documents
- **Active → Completed**: Requires completed post-rental inspection + deposit settled

---

## 30. End-to-End Business Flow End-to-End

### 30.1 Happy Path

```
1. Customer booking via Landing Page
   → POST /public/bookings → status: pending_payment
   → iFortePay Payment Page → customer bayar

2. Payment confirmed (webhook)
   → Booking status: Confirmed
   → WhatsApp: "Booking confirmed" ke customer

3. Customer datang ke lokasi
   → Staff cek KTP/SIM → Upload & Verify
   → Status dokumen: verified

4. Pre-Rental Inspection
   → Staff isi checklist + foto 4 sisi
   → Catat KM awal, BBM level
   → Status: completed

5. Contract Signing
   → Generate kontrak dari data booking
   → Customer tanda tangan (tablet)
   → Staff tanda tangan
   → Status: signed

6. Rental Start
   → Booking status: Active
   → WhatsApp: "Rental started" ke customer
   → Kendaraan diserahkan

7. H-1 sebelum endDate (jika masih Active)
   → WhatsApp: "Rental reminder" ke customer

8. Customer kembalikan kendaraan
   → Post-Rental Inspection
   → Staff isi checklist + foto 4 sisi
   → Catat KM akhir, BBM level
   → System compare pre vs post

9. Auto-detect penalties (jika ada)
   → Kerusakan baru → penalty type: damage
   → Telat → penalty type: late_return
   → BBM kurang → penalty type: fuel_shortage
   → Staff review & confirm penalties

10. Deposit Settlement
    → Deductions = total penalties from deposit
    → Refund = deposit - deductions
    → WhatsApp: "Deposit refund" ke customer

11. Complete
    → Booking status: Completed
    → WhatsApp: "Return confirmed" ke customer
```

### 30.2 Overdue Path

```
Melewati endDate, status masih Active:
  → Cron/Scheduler check daily
  → WhatsApp: "Rental overdue" ke customer
  → Auto-create penalty: late_return
  → Repeat daily until returned
```

---

## 31. MVP Implementation Order

### Sprint 7: Customer Documents + Database Setup

1. Create migration SQL (6 tabel baru)
2. Create Drizzle schema files
3. Customer documents module (upload, verify, list)

### Sprint 8: Vehicle Inspection

1. Inspection module (create, update, complete)
2. Pre-rental inspection form
3. Post-rental inspection form
4. Comparison endpoint
5. CMS: Inspection page + compare view

### Sprint 9: Deposit + Penalty

1. Deposit module (collect, refund, deduction)
2. Penalty module (create, auto-detect, waive)
3. CMS: Deposit tab + Penalty tab in booking detail
4. Integration with inspection comparison

### Sprint 10: Rental Contract

1. Contract generation (auto-fill from booking data)
2. Digital signature (signature pad component)
3. Contract number generation: `CTR-YYYY-NNNN`
4. CMS: Contract page with signature pad
5. PDF generation (optional, bisa phase 2)

### Sprint 11: WhatsApp Notifications

1. WhatsApp provider integration
2. Template engine (variable substitution)
3. Auto-send on events (booking confirmed, payment, reminder)
4. Notification log module
5. CMS: Notification logs page + manual send
6. Cron job for overdue detection

---

## 32. MVP Environment Variables

Tambahkan ke `wrangler.toml`:

```toml
# WhatsApp Provider
WHATSAPP_API_URL = "https://api.fonnte.com/send"
# WHATSAPP_API_KEY → set via `wrangler secret put`

# File Upload (jika menggunakan external storage)
# UPLOAD_ENDPOINT = ""
# UPLOAD_API_KEY → set via `wrangler secret put`
```

Tambahkan ke secrets:
```bash
npx wrangler secret put WHATSAPP_API_KEY
```

---

## Appendix: Drizzle Schema Files Structure

```
src/worker/core/database/schema/
├── bookings.ts          # (modified — add fuelLevel columns)
├── vehicle-inspections.ts  # NEW
├── customer-documents.ts   # NEW
├── booking-deposits.ts     # NEW
├── booking-penalties.ts    # NEW
├── rental-contracts.ts     # NEW
├── notification-logs.ts    # NEW
└── index.ts              # (modified — export new schemas)

src/worker/modules/
├── inspections/          # NEW
│   ├── inspections.dto.ts
│   ├── inspections.repository.ts
│   ├── inspections.service.ts
│   └── inspections.routes.ts
├── deposits/             # NEW
│   ├── deposits.dto.ts
│   ├── deposits.repository.ts
│   ├── deposits.service.ts
│   └── deposits.routes.ts
├── penalties/            # NEW
│   ├── penalties.dto.ts
│   ├── penalties.repository.ts
│   ├── penalties.service.ts
│   └── penalties.routes.ts
├── documents/            # NEW
│   ├── documents.dto.ts
│   ├── documents.repository.ts
│   ├── documents.service.ts
│   └── documents.routes.ts
├── contracts/            # NEW
│   ├── contracts.dto.ts
│   ├── contracts.repository.ts
│   ├── contracts.service.ts
│   └── contracts.routes.ts
└── notifications/        # NEW
    ├── notifications.dto.ts
    ├── notifications.repository.ts
    ├── notifications.service.ts
    └── notifications.routes.ts

src/react-app/features/
├── inspections/          # NEW
│   ├── api/inspections.ts
│   ├── components/InspectionForm.tsx
│   ├── components/InspectionCompare.tsx
│   ├── hooks/useInspections.ts
│   └── pages/InspectionPage.tsx
├── deposits/             # NEW
├── penalties/            # NEW
├── documents/            # NEW
├── contracts/            # NEW
└── notifications/        # NEW
```
