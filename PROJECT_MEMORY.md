# PROJECT_MEMORY.md

> Last updated: 2026-06-28
> Branch: `feat/phone-login`
> Production: `https://savanna-backyard.andifauzan986.workers.dev`

---

## 🎯 Project Overview

Vehicle Rental Admin Panel built with Cloudflare Workers, Hono, and React.

**Tech Stack:**
- Runtime: Cloudflare Workers
- Backend: Hono + TypeScript
- Database: Cloudflare D1 (SQLite) + Drizzle ORM
- Frontend: React 19 + React Router v7 + Tailwind CSS v4
- Auth: JWT via `@tsndr/cloudflare-worker-jwt`
- UI: shadcn/ui components

---

## 🔐 Credentials

### Admin Login
```
Email: admin@savanna.local
Password: Savanna2026Admin
```

### API Key (Public)
```
X-API-Key: savanna-dev-api-key-2026
```

### Xendit
```
XENDIT_WEBHOOK_TOKEN: uNFS64k2tEAKxRmuLFw3sLTrOSBg58SJS2tPTs6EKcPOFDCf
PAYMENT_GATEWAY_VENDOR: xendit
```

---

## ✅ Completed Features

### 1. Xendit Payment Integration Fixes
- `external_id` vs `order_id` vendor-aware handling
- `getGateway()` fix for webhookToken pass-through
- `getBookingStatus()` added 5 missing fields
- Xendit webhook token set in Cloudflare Secrets

### 2. Equipment CRUD Frontend
**Path:** `src/react-app/features/equipment/`

| File | Keterangan |
|------|------------|
| `types/equipment.types.ts` | TypeScript types (Equipment, EquipmentCategory, CreateEquipmentDTO) |
| `api/equipment.api.ts` | API calls (getAll, getById, create, update, delete) |
| `hooks/useEquipment.ts` | React Query hooks |
| `components/EquipmentTable.tsx` | Table list component |
| `components/EquipmentForm.tsx` | Form create/edit |
| `pages/EquipmentPage.tsx` | List page with search/filter |
| `pages/EquipmentDetailPage.tsx` | Detail view with edit/delete |
| `index.ts` | Barrel export |

**Routes:**
- `/equipment` - List all equipment
- `/equipment/:id` - Equipment detail

**Categories:** safety, apparel, accessories, electronics

### 3. Payment Status Dashboard
**Path:** `src/react-app/features/payments/pages/PaymentDashboardPage.tsx`

**Features:**
- Stats cards: Total Bookings, Fully Paid, DP Paid, Unpaid
- Filter by status: All, Paid, Partial, Unpaid
- Progress bar visualization (0-100%)
- Color coding: Green (Paid), Yellow (Partial), Red (Unpaid)
- Click row → navigate to booking detail

**Route:** `/payments/dashboard`

**Backend:** `GET /v1/payments/booking-summaries`

### 4. Vehicle Availability Dashboard (Mobile-First)
**Path:** `src/react-app/features/vehicles/pages/VehicleAvailabilityPage.tsx`

**Features:**
- Large search input with barcode icon for plate number scanning
- Compact stats summary (5 columns on mobile)
- Large touch-friendly vehicle cards with status indicators
- Color-coded status stripes (green/amber/red/gray)
- Current booking info with customer name and dates
- Filter by status: All, Available, Rented, Maintenance, Inactive
- Filter by type: All, StreetBike, TrailBike
- Auto-focus search on mount

**Route:** `/vehicles/availability`

**Backend:** `GET /v1/vehicles/availability-timeline`

### 5. QR Scanner Permission Handling
**Path:** `src/react-app/features/bookings/components/QrScannerModal.tsx`

**Features:**
- Permission check using Permissions API
- Camera permission request flow with clear UI
- Manual plate number input as fallback
- Error handling for denied/unavailable camera
- View modes: permission, scanner, manual, result, error

**QR Code Format:** `SVN:{vehicleId}` (e.g., `SVN:6080faa7-44e7-422e-93b2-236c9fa4ab6f`)

### 6. Mobile Navigation Fixes
**Files:**
- `src/react-app/components/layout/dashboard-layout.tsx`
- `src/react-app/components/layout/sidebar.tsx`

**Changes:**
- Header: `h-14 md:h-16`, `px-4` + `pl-10` for hamburger
- Main content: `p-3 md:p-6`
- Sidebar: `shadow-lg` on mobile, `bg-muted/30` for nav section
- Nav items: `bg-accent` on hover, `bg-primary/15` for active
- Hamburger button: `top-3 left-3`, border + shadow
- Logout: Icon-only on mobile, text on desktop

---

## 🗺️ Routes

### Frontend Routes
| Route | Page | Sidebar |
|-------|------|---------|
| `/` | DashboardPage | Dashboard |
| `/equipment` | EquipmentPage | Equipment |
| `/equipment/:id` | EquipmentDetailPage | Equipment |
| `/payments` | PaymentsPage | Payments |
| `/payments/dashboard` | PaymentDashboardPage | Payments → Dashboard |
| `/vehicles` | VehiclesPage | Vehicles |
| `/vehicles/availability` | VehicleAvailabilityPage | Vehicles → Availability |
| `/bookings` | BookingsPage | Bookings |
| `/leads` | LeadsPage | Leads |
| `/customers` | CustomersPage | Customers |
| `/maintenance` | MaintenancePage | Maintenance |
| `/calendar` | CalendarPage | Calendar |
| `/reports` | ReportsPage | Reports |

### Backend Endpoints
| Endpoint | Method | Auth | Keterangan |
|----------|--------|------|------------|
| `/v1/auth/login` | POST | No | Login |
| `/v1/auth/me` | GET | Yes | Get current user |
| `/v1/auth/logout` | POST | Yes | Logout |
| `/v1/equipment` | GET/POST | Yes | List/Create equipment |
| `/v1/equipment/:id` | GET/PATCH/DELETE | Yes | Get/Update/Delete equipment |
| `/v1/payments/booking-summaries` | GET | Yes | Payment summaries |
| `/v1/vehicles/availability-timeline` | GET | Yes | Vehicle availability |
| `/v1/bookings/scan-return` | POST | Yes | Scan QR for return |
| `/v1/public/equipment` | GET | API Key | Public equipment list |
| `/v1/public/vehicles` | GET | API Key | Public vehicle list |

---

## 📁 File Structure

```
src/react-app/features/
├── auth/                    # Login page
├── bookings/                # Bookings CRUD + QR scanner
│   └── components/
│       └── QrScannerModal.tsx    # REWRITTEN - permission handling
├── calendar/                # Calendar view
├── customers/               # Customers CRUD
├── dashboard/               # Dashboard page
├── equipment/               # NEW - Equipment CRUD
│   ├── api/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   ├── types/
│   └── index.ts
├── leads/                   # Leads management
├── maintenance/             # Maintenance scheduling
├── packages/                # Package management
├── payments/                # Payments + Dashboard
│   └── pages/
│       └── PaymentDashboardPage.tsx  # NEW
├── pricing/                 # Pricing management
├── reports/                 # Report generation
├── reviews/                 # Reviews management
├── settings/                # Settings
├── shared/                  # Shared types/utils
├── trails/                  # Trail management
├── users/                   # User management
└── vehicles/                # Vehicles + Availability
    └── pages/
        └── VehicleAvailabilityPage.tsx  # REWRITTEN

src/react-app/components/layout/
├── dashboard-layout.tsx     # UPDATED - mobile fixes
└── sidebar.tsx              # UPDATED - nav styling
```

---

## 🚀 Deployment History

| Commit | Message | Date |
|--------|---------|------|
| `5e76976` | feat: Equipment CRUD frontend, Payment Dashboard, Vehicle Availability Dashboard | 2026-06-27 |
| `704449b` | fix: TypeScript errors in equipment and payment dashboard | 2026-06-28 |
| `2882f22` | feat: mobile-first vehicle availability page for barcode scanning | 2026-06-28 |
| `4d03d83` | fix: QR scanner camera permission handling for mobile | 2026-06-28 |
| `bf48a22` | fix: TypeScript error in QrScannerModal stopScanner | 2026-06-28 |
| `e572f83` | fix: mobile navigation overlap issues | 2026-06-28 |
| `50f4009` | feat: improve mobile sidebar background and nav items | 2026-06-28 |

---

## 📊 Test Stats

- **871 tests passing**
- **TypeScript clean**
- **Lint clean** (only warnings in sidebar exports)

---

## ⚠️ Known Issues

1. **Equipment data** - Masih kosong (belum di-seed), perlu create dari UI
2. **QRIS** - Belum aktif di Xendit staging, `qrString` selalu null
3. **QR Code format** - `SVN:{vehicleId}` (bukan plate number)

---

## 🔧 Commands

```bash
# Development
npm run dev              # Start dev server (port 8484)
npm run build            # Build for production
npm run deploy           # Deploy to Cloudflare Workers

# Database
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Apply migrations locally
npm run db:seed          # Seed superadmin user

# Testing
npm run test             # Run tests in watch mode
npm run test:run         # Run all tests once
npm run test:coverage    # Run with coverage
npm run test:auth        # Run auth-related tests only

# Linting
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript check
```

---

## 📝 Notes

- All changes are in branch `feat/phone-login`
- Production URL: `https://savanna-backyard.andifauzan986.workers.dev`
- QR scanner needs camera permission on mobile
- Mobile-first design for vehicle availability page
- Sidebar navigation has better mobile UX with backgrounds
