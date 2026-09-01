import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler, handleError } from './core/middleware/error-handler';
import { createAuthRouter } from './modules/auth/auth.routes';
import { createCustomersRouter } from './modules/customers/customers.routes';
import { createVehiclesRouter } from './modules/vehicles/vehicles.routes';
import { createPaymentsRouter } from './modules/payments/payments.routes';
import { createBookingsRouter } from './modules/bookings/bookings.routes';
import { createMaintenanceRouter } from './modules/maintenance/maintenance.routes';
import { createPublicApiRouter } from './modules/public-api/public-api.routes';
import { createDashboardRouter } from './modules/dashboard/dashboard.routes';
import { createReportsRouter } from './modules/reports/reports.routes';
import { createWebhookRouter } from './modules/webhooks/webhooks.routes';
import { createPackagesRouter } from './modules/packages/packages.routes';
import { createPricingRouter } from './modules/pricing/pricing.routes';
import { createReviewsRouter } from './modules/reviews/reviews.routes';
import { createTrailsRouter } from './modules/trails/trails.routes';
import { createSettingsRouter } from './modules/settings/settings.routes';
import { createUsersRouter } from './modules/users/users.routes';
import { createUploadRouter } from './modules/uploads/uploads.routes';
import { createEmailsRouter } from './modules/emails/emails.routes';
import { createChecklistsRouter } from './modules/checklists/checklists.routes';
import { createEquipmentRouter } from './modules/equipment/equipment.routes';
import { createOtpRouter } from './modules/otp/otp.routes';
import { createDb } from './core/database';
import { ConfigRepository } from './core/repositories/config.repository';
import { EmailService } from './core/services/email.service';
import { NotificationService } from './core/services/notification.service';
import { VehiclesRepository } from './modules/vehicles/vehicles.repository';
import { BookingCleanupService } from './core/services/booking-cleanup.service';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware - uses environment variable for allowed origins
app.use(
	'*',
	cors({
		origin: (origin, c) => {
			const defaultOrigins = ['http://localhost:5173'];
			const allowedOrigins = c.env.CORS_ALLOWED_ORIGINS?.split(',').map((o: string) => o.trim()) ?? defaultOrigins;
			// Allow exact match from allowed list
			if (origin && allowedOrigins.includes(origin)) {
				return origin;
			}
			// Only allow localhost in development
			if (origin && c.env.ENVIRONMENT !== 'production' && origin.includes('localhost')) {
				return origin;
			}
			// D3: deny non-matching origins (was returning allowedOrigins[0],
			// which could enable credentialed cross-origin confusion).
			return null;
		},
		credentials: true,
	})
);

// Security headers middleware
app.use('*', async (c, next) => {
	await next();
	// Prevent MIME type sniffing
	c.header('X-Content-Type-Options', 'nosniff');
	// Prevent clickjacking
	c.header('X-Frame-Options', 'DENY');
	// XSS protection (legacy browsers)
	c.header('X-XSS-Protection', '1; mode=block');
	// Referrer policy
	c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
	// HSTS in production
	if (c.env.ENVIRONMENT === 'production') {
		c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}
});

// Error handler (onError catches route handler errors, middleware catches everything else)
app.onError(handleError);
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

// Bookings management routes
v1Routes.route('/bookings', createBookingsRouter() as unknown as Hono<{ Bindings: Env }>);

// Payments routes (includes gateway status and webhooks)
v1Routes.route('/payments', createPaymentsRouter() as unknown as Hono<{ Bindings: Env }>);

// Maintenance routes
v1Routes.route('/maintenance', createMaintenanceRouter() as unknown as Hono<{ Bindings: Env }>);

// Public API routes (external access with API key)
v1Routes.route('/public', createPublicApiRouter() as unknown as Hono<{ Bindings: Env }>);

// Dashboard routes
v1Routes.route('/dashboard', createDashboardRouter() as unknown as Hono<{ Bindings: Env }>);

// Reports routes
v1Routes.route('/reports', createReportsRouter() as unknown as Hono<{ Bindings: Env }>);

// Webhook routes (no auth - signature verification)
v1Routes.route('/webhooks', createWebhookRouter() as unknown as Hono<{ Bindings: Env }>);

// Content management routes (NEW)
v1Routes.route('/packages', createPackagesRouter() as unknown as Hono<{ Bindings: Env }>);
v1Routes.route('/pricing', createPricingRouter() as unknown as Hono<{ Bindings: Env }>);
v1Routes.route('/reviews', createReviewsRouter() as unknown as Hono<{ Bindings: Env }>);
v1Routes.route('/trails', createTrailsRouter() as unknown as Hono<{ Bindings: Env }>);
v1Routes.route('/settings', createSettingsRouter() as unknown as Hono<{ Bindings: Env }>);
v1Routes.route('/users', createUsersRouter() as unknown as Hono<{ Bindings: Env }>);

// File uploads (auth required for upload/delete, public read)
v1Routes.route('/uploads', createUploadRouter() as unknown as Hono<{ Bindings: Env }>);

// Email routes (admin only)
v1Routes.route('/emails', createEmailsRouter() as unknown as Hono<{ Bindings: Env }>);

// Vehicle condition checklists
v1Routes.route('/checklists', createChecklistsRouter() as unknown as Hono<{ Bindings: Env }>);

// Equipment management (admin CRUD; public read is under /public)
v1Routes.route('/equipment', createEquipmentRouter() as unknown as Hono<{ Bindings: Env }>);

// OTP audit list (SUPER_ADMIN only)
v1Routes.route('/otp', createOtpRouter() as unknown as Hono<{ Bindings: Env }>);

// Mount v1 routes under /api/v1
app.route('/api/v1', v1Routes);

// Legacy /api redirect to /api/v1 (only for /api/* that's not /api/v1/*)
// This redirect is disabled to prevent redirect loops
// app.get('/api/*', (c) => {
// 	const path = c.req.path;
// 	if (!path.startsWith('/api/v1')) {
// 		const newPath = path.replace('/api', '/api/v1');
// 		return c.redirect(newPath);
// 	}
// 	return c.text('Not found', 404);
// });

// Serve images from R2 (legacy /images/* paths from seed data)
app.get('/images/:key{.+}', async (c) => {
	const bucket = c.env.UPLOADS;
	if (!bucket) {
		return c.json({ success: false, error: { code: 'NO_BUCKET', message: 'R2 bucket not configured' } }, 500);
	}

	const key = c.req.param('key');
	const object = await bucket.get(key);

	if (!object) {
		return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Image not found' } }, 404);
	}

	const headers = new Headers();
	headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
	headers.set('Cache-Control', 'public, max-age=31536000, immutable');

	return new Response(object.body, { headers });
});

// Scheduled handler for Cloudflare Cron Triggers
async function handleScheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
  void _ctx;
  console.log('[Scheduled] Running notification jobs...');

  if (!env.RESEND_API_KEY) {
    console.log('[Scheduled] RESEND_API_KEY not configured, skipping email notifications');
    return;
  }

  const db = createDb(env.DB);
  const configRepo = new ConfigRepository(db);
  const vehicleRepo = new VehiclesRepository(db);
  const emailService = new EmailService({
    apiKey: env.RESEND_API_KEY,
    fromEmail: env.EMAIL_FROM || 'Savanna Bromo <noreply@savannabromo.com>',
  });
  const notificationService = new NotificationService(db, emailService, configRepo);

  try {
    // 1. Auto-release vehicles from Cleaning → Available
    let cleanableVehicles = 0;
    try {
      const vehicles = await vehicleRepo.getCleanableVehicles();
      for (const v of vehicles) {
        await vehicleRepo.markCleaned(v.id);
        console.log(`[Scheduled] Vehicle ${v.plateNumber} (${v.name}) auto-released from Cleaning → Available`);
        cleanableVehicles++;
      }
    } catch (error) {
      console.error('[Scheduled] Error releasing cleaned vehicles:', error);
    }

    // 2. Run notification jobs
    const dailyReminders = await notificationService.runDailyReminders();
    const hourlyReminders = await notificationService.runHourlyReminders();
    const followups = await notificationService.runFollowups();

    // 3-4. Pickup/return status transitions must stay behind the scan endpoints.
    // The scheduler may remind or clean up, but must not auto-confirm pickup/return.
    const activatedCount = 0;
    const completedCount = 0;

    // 5. Cleanup expired pending_payment bookings (vehicle lock leak prevention)
    let cleanupResult: { processed: number; stockRestored: number; failed: number } | null = null;
    try {
      const cleanupService = new BookingCleanupService(db);
      cleanupResult = await cleanupService.runCleanupExpiredBookings();
      console.log('[Scheduled] Expired booking cleanup:', cleanupResult);
    } catch (error) {
      console.error('[Scheduled] Error running expired booking cleanup:', error);
    }

    console.log('[Scheduled] All jobs completed:', {
      cleanableVehicles,
      dailyReminders,
      hourlyReminders,
      followups,
      activated: activatedCount,
      overdueCompleted: completedCount,
      cleanupExpired: cleanupResult,
    });
  } catch (error) {
    console.error('[Scheduled] Error running notification jobs:', error);
  }
}

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
};
