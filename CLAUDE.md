# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vehicle Rental Admin Panel built with Cloudflare Workers, Hono, and React.

**Tech Stack:**
- Runtime: Cloudflare Workers
- Backend: Hono + TypeScript
- Database: Cloudflare D1 (SQLite) + Drizzle ORM
- Frontend: React 19 + React Router v7 + Tailwind CSS v4
- Auth: JWT via `@tsndr/cloudflare-worker-jwt`

## Commands

```bash
npm run dev           # Start development server (port 8484)
npm run build         # Build for production (tsc + vite)
npm run deploy        # Deploy to Cloudflare Workers

# Database
npm run db:generate   # Generate Drizzle migrations
npm run db:migrate    # Apply migrations locally
npm run db:seed       # Seed superadmin user

# Testing
npm run test          # Run tests in watch mode
npm run test:run      # Run all tests once
npm run test:coverage # Run with coverage
npm run test:auth     # Run auth-related tests only
```

## Architecture

### Backend (src/worker/)

```
worker/
├── index.ts              # Hono app entry point, route mounting
├── core/
│   ├── database/         # Drizzle schema and db wrapper
│   │   ├── schema/       # Table definitions (users, customers, etc.)
│   │   └── index.ts      # Database connection factory
│   ├── middleware/       # Auth, error handling, validation, API key
│   ├── repositories/     # Shared repositories (config, statistics, token-blacklist)
│   ├── services/         # Shared services (JWT, payment gateway)
│   ├── lib/              # Utilities (CSV export)
│   └── types/            # Shared types and custom errors
└── modules/
    ├── auth/             # Auth module (login, logout, me)
    ├── customers/        # Customer CRUD + blacklist
    ├── vehicles/         # Vehicle CRUD + status + availability
    ├── leads/            # Lead management + notes + assignment
    ├── bookings/         # Booking workflow + addons
    ├── payments/         # Payment management + gateway integration
    ├── maintenance/      # Maintenance scheduling + history
    ├── dashboard/        # Dashboard statistics
    ├── reports/          # Report generation (JSON/CSV)
    ├── statistics/       # Statistics service (shared)
    └── public-api/       # External API with API key auth
```

### Frontend (src/react-app/)

```
react-app/
├── main.tsx              # Entry point
├── App.tsx               # Root component with providers
├── router/               # React Router config, layouts, guards
│   ├── routes.tsx        # Route definitions
│   ├── guards/           # AuthGuard, GuestGuard
│   └── layouts/          # RootLayout, DashboardLayout, AuthLayout
├── features/             # Feature modules
│   ├── auth/             # Login page
│   ├── dashboard/        # Dashboard page
│   ├── customers/        # Customers list + detail
│   ├── vehicles/         # Vehicles list + detail
│   ├── leads/            # Leads list + detail
│   ├── bookings/         # Bookings list + detail
│   ├── payments/         # Payments list + detail
│   ├── maintenance/      # Maintenance list + detail
│   ├── reports/          # Report pages (revenue, fleet, etc.)
│   └── shared/           # Shared components
├── components/ui/        # shadcn/ui components
├── hooks/                # Global hooks
└── lib/                  # Utilities (api-client, utils)
```

### Tests (tests/)

```
tests/
├── unit/                 # Unit tests per module
├── integration/          # Integration tests
└── test/                 # Test utilities and setup
    ├── setup.ts          # Vitest setup, crypto polyfill
    └── utils/            # Mock factories, helpers
```

## Key Patterns

### Middleware-based Dependency Injection

Services are injected per-request via Hono middleware, NOT at module load time. This ensures `c.env` (containing DB, JWT_SECRET) is available when services are created.

```typescript
// customers.routes.ts - CORRECT pattern
const customersServicesMiddleware = () => async (c, next) => {
  const db = createDb(c.env.DB);
  const customersRepository = new CustomersRepository(db);
  const customersService = new CustomersService(customersRepository);
  c.set('customersService', customersService);
  await next();
};

router.use('*', customersServicesMiddleware());
router.get('/', (c) => {
  const customersService = c.get('customersService');
  // ...
});
```

### Path Aliases

- `@/` → `./src` (e.g., `@/worker/core/database`)
- `@test/` → `./tests/test` (e.g., `@test/utils`)

Configured in both `vite.config.ts` and `vitest.config.ts`.

### Password Hashing

Uses PBKDF2-SHA256 with Web Crypto API. **Do NOT use bcrypt** - it's not compatible with Cloudflare Workers. Format: base64(salt + derivedKey).

### Error Handling

Custom error classes in `src/worker/core/types/errors.ts`:
- `UnauthorizedError` → 401
- `NotFoundError` → 404
- `ValidationError` → 400
- `ForbiddenError` → 403

All errors flow through `errorHandler` middleware.

### API Response Format

All API responses follow this format:
```typescript
// Success
{ success: true, data: {...} }

// Error
{ success: false, error: { code: 'ERROR_CODE', message: 'Error description' } }
```

## API Structure

All API routes are under `/api/v1`:

### Auth (`/api/v1/auth`)
- `POST /login` - Login
- `GET /me` - Get current user (protected)
- `POST /logout` - Logout (blacklist token)

### Customers (`/api/v1/customers`)
- `GET /` - List customers
- `GET /:id` - Get customer
- `GET /by-phone/:phone` - Get by phone
- `POST /` - Create customer
- `PATCH /:id` - Update customer
- `PATCH /:id/blacklist` - Set blacklist status

### Vehicles (`/api/v1/vehicles`)
- `GET /` - List vehicles
- `GET /availability` - Check availability
- `GET /:id` - Get vehicle
- `GET /:id/calendar` - Get calendar
- `POST /` - Create vehicle
- `PATCH /:id` - Update vehicle
- `PATCH /:id/status` - Update status

### Leads (`/api/v1/leads`)
- `GET /` - List leads
- `GET /stats` - Statistics
- `GET /:id` - Get lead
- `POST /` - Create lead
- `PATCH /:id` - Update lead
- `PATCH /:id/status` - Update status
- `POST /:id/notes` - Add note
- `POST /:id/assign` - Assign to user

### Bookings (`/api/v1/bookings`)
- `GET /` - List bookings
- `GET /availability` - Check availability
- `GET /stats` - Statistics
- `GET /number/:bookingNumber` - Get by number
- `GET /:id` - Get booking
- `POST /` - Create booking
- `PATCH /:id` - Update booking
- `POST /:id/confirm` - Confirm
- `POST /:id/start` - Start rental
- `POST /:id/complete` - Complete rental
- `POST /:id/extend` - Extend rental
- `POST /:id/cancel` - Cancel
- `POST /:id/addons` - Add addon
- `DELETE /:id/addons/:addonId` - Remove addon

### Payments (`/api/v1/payments`)
- `GET /` - List payments
- `GET /pending` - Pending payments
- `GET /stats` - Statistics
- `GET /gateway/status` - Gateway status
- `GET /:id` - Get payment
- `POST /` - Create payment
- `POST /:id/verify` - Verify payment
- `POST /:id/reject` - Reject payment
- `POST /webhooks/:vendor` - Webhook (no auth)

### Maintenance (`/api/v1/maintenance`)
- `GET /` - List records
- `GET /upcoming` - Upcoming maintenance
- `GET /:id` - Get record
- `GET /vehicles/:vehicleId/history` - Vehicle history
- `GET /vehicles/:vehicleId/summary` - Vehicle summary
- `POST /` - Create record
- `PATCH /:id` - Update record
- `POST /:id/start` - Start maintenance
- `POST /:id/complete` - Complete maintenance

### Dashboard (`/api/v1/dashboard`)
- `GET /overview` - Overview stats
- `GET /revenue` - Revenue stats
- `GET /leads` - Lead stats
- `GET /fleet` - Fleet utilization
- `GET /payments` - Payment overview
- `GET /activities` - Upcoming activities

### Reports (`/api/v1/reports`)
- `GET /revenue` - Revenue report (supports ?format=csv)
- `GET /fleet-utilization` - Fleet report
- `GET /lead-sources` - Lead source report
- `GET /payments` - Payment report
- `GET /customers` - Customer report

### Public API (`/api/v1/public`)
Requires `X-API-Key` header.
- `POST /leads` - Submit lead
- `GET /availability` - Check availability
- `GET /vehicle-types` - Get vehicle types
- `GET /vehicles/:id` - Get vehicle details

### Health
- `GET /api/v1/health` - Health check

JWT token stored in httpOnly cookie named `token`.

## Database Tables

Located in `src/worker/core/database/schema/`:
- `users.ts` - Admin users
- `customers.ts` - Customers with blacklist
- `vehicles.ts` - Vehicle fleet
- `vehicle-status-logs.ts` - Status change history
- `leads.ts` - Sales leads
- `bookings.ts` - Rental bookings
- `booking-addons.ts` - Booking addons
- `payments.ts` - Payment records
- `maintenance.ts` - Maintenance records
- `system-config.ts` - Key-value config
- `token-blacklist.ts` - JWT blacklist

## Payment Gateway Integration

Supports multiple payment gateways via `PaymentGatewayFactory`:
- **Manual** - Bank transfer, cash (default)
- **Midtrans** - QRIS, gateway payment
- **Xendit** - Alternative gateway

Gateway configuration stored in `system_config` table.

## Security Notes (Audit Fixes)

- **Rate limiting**: `src/worker/core/middleware/rate-limit.ts` uses an
  in-memory `Map` that is **per-isolate** on Cloudflare Workers. Isolates are
  evicted frequently, so the login brute-force throttle is effectively
  best-effort, not reliable. For real protection, configure **Cloudflare Rate
  Limiting Rules** in the dashboard (WAF) for `/api/v1/auth/login` and the
  public API. Do NOT rely on the in-memory limiter for production security.
- **Webhook verification**: all payment webhooks verify signatures. The
  iFortePay route returns `410 Gone` when `IFORTEPAY_HASH_KEY` is unset
  (fail-closed). The dedicated `/webhooks/{vendor}/notification` routes are
  preferred over the deprecated generic `/payments/webhooks/:vendor`.
- **Double-booking**: D1 has no transactions. `bookings.service.create` does a
  re-verify immediately before insert to narrow the TOCTOU window, but this is
  not a hard guarantee. A unique constraint or D1-compatible advisory lock
  would be needed for strict prevention.
- **Settings secrets**: `settings.service` redacts secret config keys
  (`*_key`, `*_secret`, gateway keys) to `***` for non-SUPER_ADMIN callers.
- **Timing-safe comparison**: use `core/lib/crypto-safe-equal.ts` for any
  secret/token comparison — never raw `===`.
