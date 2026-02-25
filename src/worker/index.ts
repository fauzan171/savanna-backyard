import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './core/middleware/error-handler';
import { createAuthRoutes } from './modules/auth/auth.routes';

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

// Health check (no env needed)
v1Routes.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Mount v1 routes under /api/v1
app.route('/api/v1', v1Routes);

// Auth routes - use wildcard to handle all auth routes
app.all('/api/v1/auth/*', async (c) => {
	const authRoutes = createAuthRoutes(c.env);
	return authRoutes.getRouter().fetch(c.req.raw, c.env, c.executionCtx);
});

// Legacy /api redirect to /api/v1 (optional)
app.get('/api/*', (c) => {
	const path = c.req.path.replace('/api', '/api/v1');
	return c.redirect(path);
});

export default app;
