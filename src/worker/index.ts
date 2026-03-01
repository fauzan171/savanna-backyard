import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './core/middleware/error-handler';
import { createAuthRouter } from './modules/auth/auth.routes';
import { createCustomersRouter } from './modules/customers/customers.routes';
import { createVehiclesRouter } from './modules/vehicles/vehicles.routes';
import { createLeadsRouter } from './modules/leads/leads.routes';
import { createPaymentsRouter } from './modules/payments/payments.routes';
import { createBookingsRouter } from './modules/bookings/bookings.routes';
import { createMaintenanceRouter } from './modules/maintenance/maintenance.routes';
import { createPublicApiRouter } from './modules/public-api/public-api.routes';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use(
	'*',
	cors({
		origin: ['http://localhost:5173'],
		credentials: true,
	})
);

// Error handler
app.use('*', errorHandler);

// API v1 routes
const v1Routes = new Hono<{ Bindings: Env }>();

// Health check
v1Routes.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Auth routes
v1Routes.route('/auth', createAuthRouter() as unknown as Hono<{ Bindings: Env }>);

// Customer management routes
v1Routes.route('/customers', createCustomersRouter() as unknown as Hono<{ Bindings: Env }>);

// Vehicle management routes
v1Routes.route('/vehicles', createVehiclesRouter() as unknown as Hono<{ Bindings: Env }>);

// Leads management routes
v1Routes.route('/leads', createLeadsRouter() as unknown as Hono<{ Bindings: Env }>);

// Bookings management routes
v1Routes.route('/bookings', createBookingsRouter() as unknown as Hono<{ Bindings: Env }>);

// Payments routes (includes gateway status and webhooks)
v1Routes.route('/payments', createPaymentsRouter() as unknown as Hono<{ Bindings: Env }>);

// Maintenance routes
v1Routes.route('/maintenance', createMaintenanceRouter() as unknown as Hono<{ Bindings: Env }>);

// Public API routes (external access with API key)
v1Routes.route('/public', createPublicApiRouter() as unknown as Hono<{ Bindings: Env }>);

// Mount v1 routes under /api/v1
app.route('/api/v1', v1Routes);

// Legacy /api redirect to /api/v1 (optional)
app.get('/api/*', (c) => {
	const path = c.req.path.replace('/api', '/api/v1');
	return c.redirect(path);
});

export default app;
