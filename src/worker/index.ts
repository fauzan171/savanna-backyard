import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './core/middleware/error-handler';
import { createAuthRouter } from './modules/auth/auth.routes';

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

// Auth routes - router created once, services injected per-request via middleware
v1Routes.route('/auth', createAuthRouter() as unknown as Hono<{ Bindings: Env }>);

// Mount v1 routes under /api/v1
app.route('/api/v1', v1Routes);

// Legacy /api redirect to /api/v1 (optional)
app.get('/api/*', (c) => {
	const path = c.req.path.replace('/api', '/api/v1');
	return c.redirect(path);
});

export default app;
