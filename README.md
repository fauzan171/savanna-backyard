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
│   ├── index.ts           # Entry point
│   ├── core/              # Core infrastructure
│   │   ├── container/     # DI container
│   │   ├── database/      # Drizzle schema
│   │   ├── middleware/    # Auth, error, validation
│   │   ├── services/      # Shared services
│   │   └── types/         # Shared types
│   └── modules/           # Feature modules
│       └── auth/          # Auth module
│
└── react-app/             # Frontend
    ├── main.tsx           # Entry point
    ├── App.tsx            # Root component
    ├── router/            # React Router config
    ├── features/          # Feature modules
    │   ├── auth/          # Auth feature
    │   └── dashboard/     # Dashboard feature
    ├── components/        # UI components
    ├── hooks/             # Global hooks
    └── lib/               # Utilities
```

## API Endpoints

### Auth (`/api/v1/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /login | Login with email/password |
| GET | /me | Get current user (protected) |
| POST | /logout | Logout (clear cookie) |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/health | Health check |

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run deploy       # Deploy to Cloudflare Workers
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply migrations (local)
npm run db:seed      # Seed database (local)
```

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Vite Documentation](https://vitejs.dev/guide/)
- [React Documentation](https://reactjs.org/)
- [Hono Documentation](https://hono.dev/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
