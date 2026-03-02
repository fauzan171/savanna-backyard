# Savanna Backyard

Vehicle Rental Admin Panel built with Cloudflare Workers, Hono, and React.

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Backend**: Hono + TypeScript
- **Database**: Cloudflare D1 (SQLite) + Drizzle ORM
- **Frontend**: React 19 + React Router v7
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **State**: Zustand + TanStack Query
- **Auth**: JWT via @tsndr/cloudflare-worker-jwt

## Features

### Backend Modules

- **Auth** - Authentication with JWT, token blacklist, login/logout
- **Customers** - Customer management with blacklist support
- **Vehicles** - Fleet management with status tracking and availability calendar
- **Leads** - Lead management with notes, assignment, and status tracking
- **Bookings** - Rental bookings with addons, extensions, and status workflow
- **Payments** - Payment management with gateway integration (Midtrans/Xendit)
- **Maintenance** - Vehicle maintenance scheduling and history
- **Dashboard** - Statistics and overview for admin panel
- **Reports** - Revenue, fleet utilization, lead sources, and customer reports (JSON/CSV)
- **Public API** - External API with API key authentication for web forms

### Frontend Features

- Dashboard with statistics overview
- Customer management (list, detail, blacklist)
- Vehicle management (list, detail, calendar view)
- Lead management (list, detail, notes)
- Booking management (list, detail, status workflow)
- Payment management (list, detail, verification)
- Maintenance tracking (list, detail, scheduling)
- Reports (revenue, fleet, leads, payments, customers)

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Wrangler CLI (`npm install -g wrangler`)

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure local secrets**
   ```bash
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars and set your JWT_SECRET
   ```

3. **Create local D1 database**
   ```bash
   wrangler d1 create savanna-backyard-db --local
   ```

4. **Run migrations**
   ```bash
   wrangler d1 migrations apply savanna-backyard-db --local
   ```

5. **Seed super admin**
   ```bash
   npm run db:seed
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

### Default Credentials

- **Email**: admin@savanna.local
- **Password**: admin123

## Project Structure

```
src/
├── worker/                 # Backend (Cloudflare Worker)
│   ├── index.ts           # Entry point, route mounting
│   ├── core/              # Core infrastructure
│   │   ├── database/      # Drizzle schema
│   │   ├── middleware/    # Auth, error, validation, API key
│   │   ├── repositories/  # Shared repositories
│   │   ├── services/      # Shared services (JWT, payment gateway)
│   │   ├── lib/           # Utilities (CSV export)
│   │   └── types/         # Shared types and errors
│   └── modules/           # Feature modules
│       ├── auth/          # Auth module
│       ├── customers/     # Customer management
│       ├── vehicles/      # Vehicle management
│       ├── leads/         # Lead management
│       ├── bookings/      # Booking management
│       ├── payments/      # Payment management
│       ├── maintenance/   # Maintenance tracking
│       ├── dashboard/     # Dashboard statistics
│       ├── reports/       # Report generation
│       ├── statistics/    # Statistics service
│       └── public-api/    # External API
│
└── react-app/             # Frontend
    ├── main.tsx           # Entry point
    ├── App.tsx            # Root component
    ├── router/            # React Router config
    ├── features/          # Feature modules
    │   ├── auth/          # Auth pages
    │   ├── dashboard/     # Dashboard page
    │   ├── customers/     # Customer pages
    │   ├── vehicles/      # Vehicle pages
    │   ├── leads/         # Lead pages
    │   ├── bookings/      # Booking pages
    │   ├── payments/      # Payment pages
    │   ├── maintenance/   # Maintenance pages
    │   ├── reports/       # Report pages
    │   └── shared/        # Shared components
    ├── components/        # UI components
    ├── hooks/             # Global hooks
    └── lib/               # Utilities
```

## API Endpoints

All API routes are under `/api/v1`.

### Auth (`/api/v1/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /login | Login with email/password |
| GET | /me | Get current user (protected) |
| POST | /logout | Logout (clear cookie + blacklist token) |

### Customers (`/api/v1/customers`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List customers (paginated, filterable) |
| GET | /:id | Get customer by ID |
| GET | /by-phone/:phone | Get customer by phone |
| POST | / | Create customer |
| PATCH | /:id | Update customer |
| PATCH | /:id/blacklist | Set blacklist status |

### Vehicles (`/api/v1/vehicles`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List vehicles (paginated, filterable) |
| GET | /availability | Check vehicle availability |
| GET | /:id | Get vehicle by ID |
| GET | /:id/calendar | Get vehicle calendar |
| POST | / | Create vehicle |
| PATCH | /:id | Update vehicle |
| PATCH | /:id/status | Update vehicle status |

### Leads (`/api/v1/leads`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List leads (paginated, filterable) |
| GET | /stats | Get lead statistics |
| GET | /:id | Get lead by ID |
| POST | / | Create lead |
| PATCH | /:id | Update lead |
| PATCH | /:id/status | Update lead status |
| POST | /:id/notes | Add note to lead |
| POST | /:id/assign | Assign lead to user |

### Bookings (`/api/v1/bookings`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List bookings (paginated, filterable) |
| GET | /availability | Check booking availability |
| GET | /stats | Get booking statistics |
| GET | /number/:bookingNumber | Get booking by number |
| GET | /:id | Get booking by ID |
| POST | / | Create booking |
| PATCH | /:id | Update booking |
| POST | /:id/confirm | Confirm booking |
| POST | /:id/start | Start rental (pickup) |
| POST | /:id/complete | Complete rental (return) |
| POST | /:id/extend | Extend rental |
| POST | /:id/cancel | Cancel booking |
| POST | /:id/addons | Add addon |
| DELETE | /:id/addons/:addonId | Remove addon |

### Payments (`/api/v1/payments`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List payments (paginated, filterable) |
| GET | /pending | Get pending payments |
| GET | /stats | Get payment statistics |
| GET | /gateway/status | Get payment gateway status |
| GET | /:id | Get payment by ID |
| POST | / | Create payment |
| POST | /:id/verify | Verify payment |
| POST | /:id/reject | Reject payment |
| POST | /webhooks/:vendor | Payment gateway webhook |

### Maintenance (`/api/v1/maintenance`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List maintenance records |
| GET | /upcoming | Get upcoming maintenance |
| GET | /:id | Get maintenance by ID |
| GET | /vehicles/:vehicleId/history | Get vehicle maintenance history |
| GET | /vehicles/:vehicleId/summary | Get vehicle maintenance summary |
| POST | / | Create maintenance record |
| PATCH | /:id | Update maintenance record |
| POST | /:id/start | Start maintenance |
| POST | /:id/complete | Complete maintenance |

### Dashboard (`/api/v1/dashboard`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /overview | Get dashboard overview |
| GET | /revenue | Get revenue statistics |
| GET | /leads | Get lead statistics |
| GET | /fleet | Get fleet utilization |
| GET | /payments | Get payment status overview |
| GET | /activities | Get upcoming activities |

### Reports (`/api/v1/reports`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /revenue | Revenue report (supports CSV export) |
| GET | /fleet-utilization | Fleet utilization report (supports CSV) |
| GET | /lead-sources | Lead source analysis (supports CSV) |
| GET | /payments | Payment report (supports CSV) |
| GET | /customers | Customer report (supports CSV) |

### Public API (`/api/v1/public`)

External API with API key authentication (header: `X-API-Key`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /leads | Submit lead from web forms |
| GET | /availability | Check vehicle availability |
| GET | /vehicle-types | Get available vehicle types |
| GET | /vehicles/:id | Get vehicle details |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/health | Health check |

## Database Schema

- **users** - Admin users (SUPER_ADMIN, STAFF)
- **customers** - Customer information with blacklist support
- **vehicles** - Vehicle fleet with status tracking
- **vehicle_status_logs** - Vehicle status change history
- **leads** - Sales leads with notes and assignment
- **bookings** - Rental bookings
- **booking_addons** - Additional items for bookings
- **payments** - Payment records
- **maintenance** - Vehicle maintenance records
- **system_config** - System configuration (key-value)
- **token_blacklist** - JWT token blacklist

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run deploy       # Deploy to Cloudflare Workers
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply migrations (local)
npm run db:seed      # Seed database (local)
npm run test         # Run tests in watch mode
npm run test:run     # Run all tests once
npm run test:coverage # Run with coverage
```

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Vite Documentation](https://vitejs.dev/guide/)
- [React Documentation](https://reactjs.org/)
- [Hono Documentation](https://hono.dev/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
