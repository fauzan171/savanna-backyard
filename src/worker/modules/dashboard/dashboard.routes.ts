/**
 * Dashboard Routes
 * Endpoints for admin dashboard statistics
 */
import { Hono } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { StatisticsRepository } from '@/worker/core/repositories/statistics.repository';
import { StatisticsService } from '@/worker/modules/statistics/statistics.service';

type DashboardVariables = {
	statisticsService: StatisticsService;
	user: { userId: string; role: string };
};

type DashboardEnv = { Bindings: Env; Variables: DashboardVariables };

// Middleware for injecting StatisticsService
const dashboardServicesMiddleware = () => async (c: any, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const statisticsRepo = new StatisticsRepository(db);
	const statisticsService = new StatisticsService(statisticsRepo);
	c.set('statisticsService', statisticsService);
	await next();
};

// ============ Handlers ============

/**
 * GET /api/v1/dashboard/overview
 * Get dashboard overview stats
 */
const overviewHandler = async (c: any) => {
	const service = c.get('statisticsService') as StatisticsService;
	const query = c.req.query();
	const period = query.period ?? 'today';

	const result = await service.getOverview({ period });
	return c.json({ success: true, data: result });
};

/**
 * GET /api/v1/dashboard/revenue
 * Get revenue statistics
 */
const revenueHandler = async (c: any) => {
	const service = c.get('statisticsService') as StatisticsService;
	const query = c.req.query();

	const result = await service.getRevenueStats({
		startDate: query.startDate,
		endDate: query.endDate,
		groupBy: query.groupBy ?? 'day',
	});
	return c.json({ success: true, data: result });
};

/**
 * GET /api/v1/dashboard/fleet
 * Get fleet utilization statistics
 */
const fleetHandler = async (c: any) => {
	const service = c.get('statisticsService') as StatisticsService;
	const query = c.req.query();

	const result = await service.getFleetStats({
		startDate: query.startDate,
		endDate: query.endDate,
	});
	return c.json({ success: true, data: result });
};

/**
 * GET /api/v1/dashboard/payments
 * Get payment status overview
 */
const paymentsHandler = async (c: any) => {
	const service = c.get('statisticsService') as StatisticsService;
	const query = c.req.query();

	const result = await service.getPaymentStats({
		startDate: query.startDate,
		endDate: query.endDate,
	});
	return c.json({ success: true, data: result });
};

/**
 * GET /api/v1/dashboard/activities
 * Get upcoming activities
 */
const activitiesHandler = async (c: any) => {
	const service = c.get('statisticsService') as StatisticsService;

	const result = await service.getActivities();
	return c.json({ success: true, data: result });
};

// ============ Router ============

export function createDashboardRouter(): Hono<DashboardEnv> {
	const router = new Hono<DashboardEnv>();

	// All routes require authentication
	router.use('*', authMiddleware());
	router.use('*', dashboardServicesMiddleware());

	// Dashboard endpoints
	router.get('/overview', overviewHandler);
	router.get('/revenue', revenueHandler);
	router.get('/fleet', fleetHandler);
	router.get('/payments', paymentsHandler);
	router.get('/activities', activitiesHandler);

	return router;
}
