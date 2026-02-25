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
│   ├── middleware/       # Auth, error handling, validation
│   ├── services/         # Shared services (JWT)
│   └── types/            # Shared types and custom errors
└── modules/
    └── auth/             # Auth feature module
        ├── auth.routes.ts    # Routes + middleware-based DI
        ├── auth.service.ts   # Business logic
        ├── auth.repository.ts # Data access
        ├── auth.dto.ts       # Zod schemas
        └── auth.types.ts     # TypeScript types
```

### Frontend (src/react-app/)

```
react-app/
├── main.tsx              # Entry point
├── App.tsx               # Root component with providers
├── router/               # React Router config, layouts, guards
├── features/             # Feature modules (auth, dashboard)
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
// auth.routes.ts - CORRECT pattern
const authServicesMiddleware = () => async (c, next) => {
  const db = createDb(c.env.DB);
  const authService = new AuthService(new UserRepository(db), new JwtService(c.env.JWT_SECRET));
  c.set('authService', authService);
  await next();
};

router.use('*', authServicesMiddleware());
router.post('/login', (c) => {
  const authService = c.get('authService');
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

All errors flow through `errorHandler` middleware.

## API Structure

All API routes are under `/api/v1`:
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user (protected)
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/health` - Health check

JWT token stored in httpOnly cookie named `token`.
