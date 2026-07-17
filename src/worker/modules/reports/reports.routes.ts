/**
 * Reports Routes
 * Endpoints for generating and exporting reports
 */
import { Hono } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { StatisticsRepository } from '@/worker/core/repositories/statistics.repository';
import { StatisticsService } from '@/worker/modules/statistics/statistics.service';
import { generateCsv, generateCsvFilename, getCsvResponseHeaders } from '@/worker/core/lib/csv-export';

type ReportsVariables = {
	statisticsService: StatisticsService;
	user: { userId: string; role: string };
};

type ReportsEnv = { Bindings: Env; Variables: ReportsVariables };

// Middleware for injecting StatisticsService
const reportsServicesMiddleware = () => async (c: any, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const statisticsRepo = new StatisticsRepository(db);
	const statisticsService = new StatisticsService(statisticsRepo);
	c.set('statisticsService', statisticsService);
	await next();
};

// ============ CSV Column Definitions ============

const revenueReportColumns = [
	{ header: 'Period', key: 'period' as const },
	{ header: 'Revenue (IDR)', key: 'revenue' as const },
	{ header: 'Bookings', key: 'bookings' as const },
	{ header: 'Average Value (IDR)', key: 'averageValue' as const },
];

const fleetUtilizationColumns = [
	{ header: 'Vehicle', key: 'vehicleName' as const },
	{ header: 'Plate Number', key: 'plateNumber' as const },
	{ header: 'Type', key: 'type' as const },
	{ header: 'Rental Days', key: 'rentalDays' as const },
	{ header: 'Available Days', key: 'availableDays' as const },
	{ header: 'Utilization Rate (%)', key: 'utilizationRate' as const },
	{ header: 'Revenue (IDR)', key: 'revenue' as const },
];

const paymentReportColumns = [
	{ header: 'Method', key: 'method' as const },
	{ header: 'Total Amount (IDR)', key: 'total' as const },
	{ header: 'Count', key: 'count' as const },
	{ header: 'Average Amount (IDR)', key: 'avgAmount' as const },
];

const customerReportColumns = [
	{ header: 'Customer ID', key: 'customerId' as const },
	{ header: 'Name', key: 'name' as const },
	{ header: 'Total Bookings', key: 'totalBookings' as const },
	{ header: 'Total Spent (IDR)', key: 'totalSpent' as const },
	{ header: 'Last Booking', key: 'lastBooking' as const },
];

// ============ Handlers ============

/**
 * GET /api/v1/reports/revenue
 * Generate revenue report
 */
const revenueReportHandler = async (c: any) => {
	const service = c.get('statisticsService') as StatisticsService;
	const query = c.req.query();
	const format = query.format ?? 'json';

	const report = await service.getRevenueReport({
		startDate: query.startDate,
		endDate: query.endDate,
		groupBy: query.groupBy ?? 'day',
		vehicleType: query.vehicleType,
	});

	if (format === 'csv') {
		const csv = generateCsv(report.breakdown, revenueReportColumns);
		const filename = generateCsvFilename('revenue-report', query.startDate, query.endDate);
		return c.text(csv, 200, getCsvResponseHeaders(filename));
	}

	return c.json({ success: true, data: report });
};

/**
 * GET /api/v1/reports/fleet-utilization
 * Generate fleet utilization report
 */
const fleetUtilizationReportHandler = async (c: any) => {
	const service = c.get('statisticsService') as StatisticsService;
	const query = c.req.query();
	const format = query.format ?? 'json';

	const report = await service.getFleetUtilizationReport({
		startDate: query.startDate,
		endDate: query.endDate,
		vehicleId: query.vehicleId,
	});

	if (format === 'csv') {
		const csv = generateCsv(report.byVehicle, fleetUtilizationColumns);
		const filename = generateCsvFilename('fleet-utilization-report', query.startDate, query.endDate);
		return c.text(csv, 200, getCsvResponseHeaders(filename));
	}

	return c.json({ success: true, data: report });
};

/**
 * GET /api/v1/reports/payments
 * Generate payment report
 */
const paymentsReportHandler = async (c: any) => {
	const service = c.get('statisticsService') as StatisticsService;
	const query = c.req.query();
	const format = query.format ?? 'json';

	const report = await service.getPaymentReport({
		startDate: query.startDate,
		endDate: query.endDate,
	});

	if (format === 'csv') {
		const csv = generateCsv(report.byMethod, paymentReportColumns);
		const filename = generateCsvFilename('payment-report', query.startDate, query.endDate);
		return c.text(csv, 200, getCsvResponseHeaders(filename));
	}

	return c.json({ success: true, data: report });
};

/**
 * GET /api/v1/reports/customers
 * Generate customer report
 */
const customersReportHandler = async (c: any) => {
	const service = c.get('statisticsService') as StatisticsService;
	const query = c.req.query();
	const format = query.format ?? 'json';

	const report = await service.getCustomerReport({
		startDate: query.startDate,
		endDate: query.endDate,
	});

	if (format === 'csv') {
		const csv = generateCsv(report.topCustomers, customerReportColumns);
		const filename = generateCsvFilename('customer-report', query.startDate, query.endDate);
		return c.text(csv, 200, getCsvResponseHeaders(filename));
	}

	return c.json({ success: true, data: report });
};

// ============ Router ============

export function createReportsRouter(): Hono<ReportsEnv> {
	const router = new Hono<ReportsEnv>();

	// All routes require authentication
	router.use('*', authMiddleware());
	router.use('*', reportsServicesMiddleware());

	// Report endpoints
	router.get('/revenue', revenueReportHandler);
	router.get('/fleet-utilization', fleetUtilizationReportHandler);
	router.get('/payments', paymentsReportHandler);
	router.get('/customers', customersReportHandler);

	return router;
}
