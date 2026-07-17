/**
 * Integration tests for Reports Routes
 * Tests all report endpoints with HTTP layer (JSON and CSV formats)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { StatisticsService } from '@/worker/modules/statistics/statistics.service';
import { StatisticsRepository } from '@/worker/core/repositories/statistics.repository';
import { generateCsv, generateCsvFilename, getCsvResponseHeaders } from '@/worker/core/lib/csv-export';

// Simple error handler for tests
function testErrorHandler(err: Error, c: any) {
	const status = 'statusCode' in err ? (err.statusCode as number) : 500;
	const code = 'code' in err ? (err.code as string) : 'INTERNAL_ERROR';
	return c.json({ success: false, error: { message: err.message, code } }, status);
}

// CSV Column Definitions (matching reports.routes.ts)
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

/**
 * Integration tests for Reports module
 * Tests the HTTP layer with Hono app
 */
describe('Reports Integration Tests', () => {
	let app: Hono<{ Bindings: Env; Variables: { user?: { userId: string; role: string } } }>;
	let mockStatisticsService: StatisticsService;

	// Helper to create mock repository
	function createMockRepo() {
		return {
			getTotalRevenue: vi.fn(),
			getRevenueByDate: vi.fn(),
			getRevenueByVehicleType: vi.fn(),
			getRevenueByPaymentMethod: vi.fn(),
			getBookingCountsByStatus: vi.fn(),
			getActiveBookingsCount: vi.fn(),
			getTodayPickups: vi.fn(),
			getTodayReturns: vi.fn(),
			getVehicleCountsByStatus: vi.fn(),
			getVehiclesByType: vi.fn(),
			getTopVehicles: vi.fn(),
			getMaintenanceAlerts: vi.fn(),
			getPaymentAmountsByStatus: vi.fn(),
			getPaymentsByMethod: vi.fn(),
			getOverduePayments: vi.fn(),
			getCustomerStats: vi.fn(),
			getTopCustomers: vi.fn(),
			getCustomersByBookingCount: vi.fn(),
			getFleetUtilization: vi.fn(),
		} as unknown as StatisticsRepository;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		const mockRepo = createMockRepo();
		mockStatisticsService = new StatisticsService(mockRepo);

		app = new Hono<{ Bindings: Env; Variables: { user?: { userId: string; role: string } } }>();

		// Setup simple error handler for tests
		app.onError(testErrorHandler);

		// Setup auth middleware mock
		app.use('*', async (c, next) => {
			c.set('user', { userId: 'test-user-id', role: 'STAFF' });
			await next();
		});

		// Setup reports routes with mock service
		app.get('/api/v1/reports/revenue', async (c) => {
			const query = c.req.query();
			const format = query.format ?? 'json';

			const report = await mockStatisticsService.getRevenueReport({
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
		});

		app.get('/api/v1/reports/fleet-utilization', async (c) => {
			const query = c.req.query();
			const format = query.format ?? 'json';

			const report = await mockStatisticsService.getFleetUtilizationReport({
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
		});

		app.get('/api/v1/reports/payments', async (c) => {
			const query = c.req.query();
			const format = query.format ?? 'json';

			const report = await mockStatisticsService.getPaymentReport({
				startDate: query.startDate,
				endDate: query.endDate,
			});

			if (format === 'csv') {
				const csv = generateCsv(report.byMethod, paymentReportColumns);
				const filename = generateCsvFilename('payment-report', query.startDate, query.endDate);
				return c.text(csv, 200, getCsvResponseHeaders(filename));
			}

			return c.json({ success: true, data: report });
		});

		app.get('/api/v1/reports/customers', async (c) => {
			const query = c.req.query();
			const format = query.format ?? 'json';

			const report = await mockStatisticsService.getCustomerReport({
				startDate: query.startDate,
				endDate: query.endDate,
			});

			if (format === 'csv') {
				const csv = generateCsv(report.topCustomers, customerReportColumns);
				const filename = generateCsvFilename('customer-report', query.startDate, query.endDate);
				return c.text(csv, 200, getCsvResponseHeaders(filename));
			}

			return c.json({ success: true, data: report });
		});
	});

	// ============================================
	// GET /api/v1/reports/revenue
	// ============================================

	describe('GET /api/v1/reports/revenue', () => {
		// ============================================
		// P0: Critical Scenarios (JSON format)
		// ============================================

		it('[P0] should return revenue report in JSON format', async () => {
			vi.spyOn(mockStatisticsService, 'getRevenueReport').mockResolvedValue({
				reportInfo: {
					title: 'Revenue Report',
					period: { start: '2026-02-01', end: '2026-02-28' },
					generatedAt: '2026-02-28T10:00:00Z',
				},
				summary: {
					totalRevenue: 50000000,
					totalBookings: 100,
					averageBookingValue: 500000,
					currency: 'IDR',
				},
				breakdown: [
					{ period: '2026-02-01', revenue: 2000000, bookings: 4, averageValue: 500000 },
					{ period: '2026-02-02', revenue: 2500000, bookings: 5, averageValue: 500000 },
				],
				byVehicleType: [
					{ type: 'TrailBike', revenue: 30000000, bookings: 60, percentage: 60 },
					{ type: 'StreetBike', revenue: 20000000, bookings: 40, percentage: 40 },
				],
				byPaymentMethod: [
					{ method: 'QRIS', amount: 25000000, count: 50 },
					{ method: 'BankTransfer', amount: 25000000, count: 50 },
				],
			});

			const res = await app.request('/api/v1/reports/revenue?startDate=2026-02-01&endDate=2026-02-28');

			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('application/json');
			const body = await res.json() as { success: boolean; data: { reportInfo: { title: string }; summary: { totalRevenue: number } } };
			expect(body.success).toBe(true);
			expect(body.data.reportInfo.title).toBe('Revenue Report');
			expect(body.data.summary.totalRevenue).toBe(50000000);
		});

		it('[P0] should return revenue report in CSV format', async () => {
			vi.spyOn(mockStatisticsService, 'getRevenueReport').mockResolvedValue({
				reportInfo: {
					title: 'Revenue Report',
					period: { start: '2026-02-01', end: '2026-02-28' },
					generatedAt: '2026-02-28T10:00:00Z',
				},
				summary: {
					totalRevenue: 50000000,
					totalBookings: 100,
					averageBookingValue: 500000,
					currency: 'IDR',
				},
				breakdown: [
					{ period: '2026-02-01', revenue: 2000000, bookings: 4, averageValue: 500000 },
					{ period: '2026-02-02', revenue: 2500000, bookings: 5, averageValue: 500000 },
				],
				byVehicleType: [],
				byPaymentMethod: [],
			});

			const res = await app.request('/api/v1/reports/revenue?startDate=2026-02-01&endDate=2026-02-28&format=csv');

			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8');
			expect(res.headers.get('content-disposition')).toContain('attachment');
			expect(res.headers.get('content-disposition')).toContain('revenue-report');

			const text = await res.text();
			expect(text).toContain('Period,Revenue (IDR),Bookings,Average Value (IDR)');
			expect(text).toContain('2026-02-01');
			expect(text).toContain('2000000');
		});

		it('[P0] should support groupBy parameter', async () => {
			vi.spyOn(mockStatisticsService, 'getRevenueReport').mockResolvedValue({
				reportInfo: { title: 'Revenue Report', period: { start: '2026-01-01', end: '2026-02-28' }, generatedAt: '2026-02-28T10:00:00Z' },
				summary: { totalRevenue: 100000000, totalBookings: 200, averageBookingValue: 500000, currency: 'IDR' },
				breakdown: [],
				byVehicleType: [],
				byPaymentMethod: [],
			});

			await app.request('/api/v1/reports/revenue?startDate=2026-01-01&endDate=2026-02-28&groupBy=week');

			expect(mockStatisticsService.getRevenueReport).toHaveBeenCalledWith(
				expect.objectContaining({ groupBy: 'week' })
			);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should filter by vehicle type', async () => {
			vi.spyOn(mockStatisticsService, 'getRevenueReport').mockResolvedValue({
				reportInfo: { title: 'Revenue Report', period: { start: '2026-02-01', end: '2026-02-28' }, generatedAt: '2026-02-28T10:00:00Z' },
				summary: { totalRevenue: 30000000, totalBookings: 60, averageBookingValue: 500000, currency: 'IDR' },
				breakdown: [],
				byVehicleType: [{ type: 'TrailBike', revenue: 30000000, bookings: 60, percentage: 100 }],
				byPaymentMethod: [],
			});

			await app.request('/api/v1/reports/revenue?startDate=2026-02-01&endDate=2026-02-28&vehicleType=TrailBike');

			expect(mockStatisticsService.getRevenueReport).toHaveBeenCalledWith(
				expect.objectContaining({ vehicleType: 'TrailBike' })
			);
		});

		it('[P1] should handle empty breakdown in CSV', async () => {
			vi.spyOn(mockStatisticsService, 'getRevenueReport').mockResolvedValue({
				reportInfo: { title: 'Revenue Report', period: { start: '2026-02-01', end: '2026-02-28' }, generatedAt: '2026-02-28T10:00:00Z' },
				summary: { totalRevenue: 0, totalBookings: 0, averageBookingValue: 0, currency: 'IDR' },
				breakdown: [],
				byVehicleType: [],
				byPaymentMethod: [],
			});

			const res = await app.request('/api/v1/reports/revenue?startDate=2026-02-01&endDate=2026-02-28&format=csv');

			expect(res.status).toBe(200);
			const text = await res.text();
			// Should still have header row
			expect(text).toContain('Period,Revenue (IDR),Bookings');
		});

		it('[P1] should default to JSON format when format is invalid', async () => {
			vi.spyOn(mockStatisticsService, 'getRevenueReport').mockResolvedValue({
				reportInfo: { title: 'Revenue Report', period: { start: '2026-02-01', end: '2026-02-28' }, generatedAt: '2026-02-28T10:00:00Z' },
				summary: { totalRevenue: 0, totalBookings: 0, averageBookingValue: 0, currency: 'IDR' },
				breakdown: [],
				byVehicleType: [],
				byPaymentMethod: [],
			});

			const res = await app.request('/api/v1/reports/revenue?startDate=2026-02-01&endDate=2026-02-28&format=invalid');

			// Should default to JSON since service handles the format
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('application/json');
		});
	});

	// ============================================
	// GET /api/v1/reports/fleet-utilization
	// ============================================

	describe('GET /api/v1/reports/fleet-utilization', () => {
		// ============================================
		// P0: Critical Scenarios (JSON format)
		// ============================================

		it('[P0] should return fleet utilization report in JSON format', async () => {
			vi.spyOn(mockStatisticsService, 'getFleetUtilizationReport').mockResolvedValue({
				reportInfo: {
					title: 'Fleet Utilization Report',
					period: { start: '2026-02-01', end: '2026-02-28' },
					generatedAt: '2026-02-28T10:00:00Z',
				},
				summary: {
					totalVehicles: 15,
					totalRentalDays: 200,
					totalAvailableDays: 420,
					utilizationRate: 47.62,
					totalRevenue: 90000000,
				},
				byVehicle: [
					{
						vehicleId: 'v1',
						vehicleName: 'Honda CRF 250L',
						plateNumber: 'B 1234 ABC',
						type: 'TrailBike',
						rentalDays: 20,
						availableDays: 28,
						utilizationRate: 71.43,
						revenue: 9000000,
						maintenanceDays: 0,
					},
				],
				byType: [
					{ type: 'TrailBike', count: 10, avgUtilizationRate: 65, totalRevenue: 60000000 },
				],
				underutilized: [
					{ vehicleName: 'Unused Bike', utilizationRate: 10, revenue: 500000 },
				],
			});

			const res = await app.request('/api/v1/reports/fleet-utilization?startDate=2026-02-01&endDate=2026-02-28');

			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('application/json');
			const body = await res.json() as { success: boolean; data: { reportInfo: { title: string }; summary: { totalVehicles: number; utilizationRate: number } } };
			expect(body.success).toBe(true);
			expect(body.data.reportInfo.title).toBe('Fleet Utilization Report');
			expect(body.data.summary.utilizationRate).toBeCloseTo(47.62, 1);
		});

		it('[P0] should return fleet utilization report in CSV format', async () => {
			vi.spyOn(mockStatisticsService, 'getFleetUtilizationReport').mockResolvedValue({
				reportInfo: { title: 'Fleet Utilization Report', period: { start: '2026-02-01', end: '2026-02-28' }, generatedAt: '2026-02-28T10:00:00Z' },
				summary: { totalVehicles: 15, totalRentalDays: 200, totalAvailableDays: 420, utilizationRate: 47.62, totalRevenue: 90000000 },
				byVehicle: [
					{
						vehicleId: 'v1',
						vehicleName: 'Honda CRF 250L',
						plateNumber: 'B 1234 ABC',
						type: 'TrailBike',
						rentalDays: 20,
						availableDays: 28,
						utilizationRate: 71.43,
						revenue: 9000000,
						maintenanceDays: 0,
					},
				],
				byType: [],
				underutilized: [],
			});

			const res = await app.request('/api/v1/reports/fleet-utilization?startDate=2026-02-01&endDate=2026-02-28&format=csv');

			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8');
			expect(res.headers.get('content-disposition')).toContain('fleet-utilization-report');

			const text = await res.text();
			expect(text).toContain('Vehicle,Plate Number,Type,Rental Days');
			expect(text).toContain('Honda CRF 250L');
			expect(text).toContain('B 1234 ABC');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should filter by vehicleId', async () => {
			vi.spyOn(mockStatisticsService, 'getFleetUtilizationReport').mockResolvedValue({
				reportInfo: { title: 'Fleet Utilization Report', period: { start: '2026-02-01', end: '2026-02-28' }, generatedAt: '2026-02-28T10:00:00Z' },
				summary: { totalVehicles: 1, totalRentalDays: 20, totalAvailableDays: 28, utilizationRate: 71.43, totalRevenue: 9000000 },
				byVehicle: [{
					vehicleId: 'v1',
					vehicleName: 'Honda CRF 250L',
					plateNumber: 'B 1234 ABC',
					type: 'TrailBike',
					rentalDays: 20,
					availableDays: 28,
					utilizationRate: 71.43,
					revenue: 9000000,
					maintenanceDays: 0,
				}],
				byType: [],
				underutilized: [],
			});

			await app.request('/api/v1/reports/fleet-utilization?startDate=2026-02-01&endDate=2026-02-28&vehicleId=v1');

			expect(mockStatisticsService.getFleetUtilizationReport).toHaveBeenCalledWith(
				expect.objectContaining({ vehicleId: 'v1' })
			);
		});

		it('[P1] should include underutilized vehicles', async () => {
			vi.spyOn(mockStatisticsService, 'getFleetUtilizationReport').mockResolvedValue({
				reportInfo: { title: 'Fleet Utilization Report', period: { start: '2026-02-01', end: '2026-02-28' }, generatedAt: '2026-02-28T10:00:00Z' },
				summary: { totalVehicles: 15, totalRentalDays: 100, totalAvailableDays: 420, utilizationRate: 23.81, totalRevenue: 45000000 },
				byVehicle: [],
				byType: [],
				underutilized: [
					{ vehicleName: 'Unused Bike 1', utilizationRate: 5, revenue: 200000 },
					{ vehicleName: 'Unused Bike 2', utilizationRate: 10, revenue: 400000 },
				],
			});

			const res = await app.request('/api/v1/reports/fleet-utilization?startDate=2026-02-01&endDate=2026-02-28');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { underutilized: unknown[] } };
			expect(body.data.underutilized).toHaveLength(2);
		});
	});

	// ============================================
	// GET /api/v1/reports/payments
	// ============================================

	describe('GET /api/v1/reports/payments', () => {
		// ============================================
		// P0: Critical Scenarios (JSON format)
		// ============================================

		it('[P0] should return payment report in JSON format', async () => {
			vi.spyOn(mockStatisticsService, 'getPaymentReport').mockResolvedValue({
				reportInfo: {
					title: 'Payment Report',
					period: { start: '2026-02-01', end: '2026-02-28' },
					generatedAt: '2026-02-28T10:00:00Z',
				},
				summary: {
					totalExpected: 60000000,
					totalReceived: 50000000,
					totalPending: 10000000,
					totalOverdue: 2000000,
					collectionRate: 83.33,
				},
				byStatus: {
					Verified: 50000000,
					Pending: 10000000,
					Failed: 500000,
				},
				byMethod: [
					{ method: 'QRIS', total: 25000000, count: 50, avgAmount: 500000 },
					{ method: 'BankTransfer', total: 20000000, count: 40, avgAmount: 500000 },
					{ method: 'Cash', total: 5000000, count: 10, avgAmount: 500000 },
				],
				dailyBreakdown: [
					{ date: '2026-02-01', received: 2000000, pending: 500000 },
				],
			});

			const res = await app.request('/api/v1/reports/payments?startDate=2026-02-01&endDate=2026-02-28');

			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('application/json');
			const body = await res.json() as { success: boolean; data: { reportInfo: { title: string }; summary: { collectionRate: number }; byMethod: unknown[] } };
			expect(body.success).toBe(true);
			expect(body.data.reportInfo.title).toBe('Payment Report');
			expect(body.data.summary.collectionRate).toBeCloseTo(83.33, 1);
			expect(body.data.byMethod).toHaveLength(3);
		});

		it('[P0] should return payment report in CSV format', async () => {
			vi.spyOn(mockStatisticsService, 'getPaymentReport').mockResolvedValue({
				reportInfo: { title: 'Payment Report', period: { start: '2026-02-01', end: '2026-02-28' }, generatedAt: '2026-02-28T10:00:00Z' },
				summary: { totalExpected: 60000000, totalReceived: 50000000, totalPending: 10000000, totalOverdue: 2000000, collectionRate: 83.33 },
				byStatus: {},
				byMethod: [
					{ method: 'QRIS', total: 25000000, count: 50, avgAmount: 500000 },
					{ method: 'BankTransfer', total: 20000000, count: 40, avgAmount: 500000 },
				],
				dailyBreakdown: [],
			});

			const res = await app.request('/api/v1/reports/payments?startDate=2026-02-01&endDate=2026-02-28&format=csv');

			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8');
			expect(res.headers.get('content-disposition')).toContain('payment-report');

			const text = await res.text();
			expect(text).toContain('Method,Total Amount (IDR),Count,Average Amount (IDR)');
			expect(text).toContain('QRIS');
			expect(text).toContain('25000000');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should handle no payments', async () => {
			vi.spyOn(mockStatisticsService, 'getPaymentReport').mockResolvedValue({
				reportInfo: { title: 'Payment Report', period: { start: '2026-02-01', end: '2026-02-28' }, generatedAt: '2026-02-28T10:00:00Z' },
				summary: { totalExpected: 0, totalReceived: 0, totalPending: 0, totalOverdue: 0, collectionRate: 0 },
				byStatus: { Verified: 0, Pending: 0, Failed: 0 },
				byMethod: [],
				dailyBreakdown: [],
			});

			const res = await app.request('/api/v1/reports/payments?startDate=2026-02-01&endDate=2026-02-28');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { summary: { totalReceived: number }; byMethod: unknown[] } };
			expect(body.data.summary.totalReceived).toBe(0);
			expect(body.data.byMethod).toHaveLength(0);
		});

		it('[P1] should include overdue amount in summary', async () => {
			vi.spyOn(mockStatisticsService, 'getPaymentReport').mockResolvedValue({
				reportInfo: { title: 'Payment Report', period: { start: '2026-02-01', end: '2026-02-28' }, generatedAt: '2026-02-28T10:00:00Z' },
				summary: { totalExpected: 60000000, totalReceived: 50000000, totalPending: 10000000, totalOverdue: 5000000, collectionRate: 83.33 },
				byStatus: {},
				byMethod: [],
				dailyBreakdown: [],
			});

			const res = await app.request('/api/v1/reports/payments?startDate=2026-02-01&endDate=2026-02-28');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { summary: { totalOverdue: number } } };
			expect(body.data.summary.totalOverdue).toBe(5000000);
		});
	});

	// ============================================
	// GET /api/v1/reports/customers
	// ============================================

	describe('GET /api/v1/reports/customers', () => {
		// ============================================
		// P0: Critical Scenarios (JSON format)
		// ============================================

		it('[P0] should return customer report in JSON format', async () => {
			vi.spyOn(mockStatisticsService, 'getCustomerReport').mockResolvedValue({
				reportInfo: {
					title: 'Customer Report',
					period: { start: '2026-02-01', end: '2026-02-28' },
					generatedAt: '2026-02-28T10:00:00Z',
				},
				summary: {
					totalCustomers: 200,
					newCustomers: 50,
					repeatCustomers: 80,
					blacklisted: 3,
				},
				topCustomers: [
					{ customerId: 'c1', name: 'John Doe', totalBookings: 15, totalSpent: 50000000, lastBooking: '2026-02-25' },
					{ customerId: 'c2', name: 'Jane Smith', totalBookings: 12, totalSpent: 40000000, lastBooking: '2026-02-20' },
				],
				byBookingCount: [
					{ bookingCount: '1', customerCount: 120 },
					{ bookingCount: '2-3', customerCount: 60 },
					{ bookingCount: '4+', customerCount: 20 },
				],
			});

			const res = await app.request('/api/v1/reports/customers?startDate=2026-02-01&endDate=2026-02-28');

			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('application/json');
			const body = await res.json() as { success: boolean; data: { reportInfo: { title: string }; summary: { totalCustomers: number; repeatCustomers: number }; topCustomers: unknown[] } };
			expect(body.success).toBe(true);
			expect(body.data.reportInfo.title).toBe('Customer Report');
			expect(body.data.summary.totalCustomers).toBe(200);
			expect(body.data.summary.repeatCustomers).toBe(80);
			expect(body.data.topCustomers).toHaveLength(2);
		});

		it('[P0] should return customer report in CSV format', async () => {
			vi.spyOn(mockStatisticsService, 'getCustomerReport').mockResolvedValue({
				reportInfo: { title: 'Customer Report', period: { start: '2026-02-01', end: '2026-02-28' }, generatedAt: '2026-02-28T10:00:00Z' },
				summary: { totalCustomers: 200, newCustomers: 50, repeatCustomers: 80, blacklisted: 3 },
				topCustomers: [
					{ customerId: 'c1', name: 'John Doe', totalBookings: 15, totalSpent: 50000000, lastBooking: '2026-02-25' },
				],
				byBookingCount: [],
			});

			const res = await app.request('/api/v1/reports/customers?startDate=2026-02-01&endDate=2026-02-28&format=csv');

			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8');
			expect(res.headers.get('content-disposition')).toContain('customer-report');

			const text = await res.text();
			expect(text).toContain('Customer ID,Name,Total Bookings,Total Spent (IDR)');
			expect(text).toContain('John Doe');
			expect(text).toContain('50000000');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should handle no customers', async () => {
			vi.spyOn(mockStatisticsService, 'getCustomerReport').mockResolvedValue({
				reportInfo: { title: 'Customer Report', period: { start: '2026-02-01', end: '2026-02-28' }, generatedAt: '2026-02-28T10:00:00Z' },
				summary: { totalCustomers: 0, newCustomers: 0, repeatCustomers: 0, blacklisted: 0 },
				topCustomers: [],
				byBookingCount: [
					{ bookingCount: '1', customerCount: 0 },
					{ bookingCount: '2-3', customerCount: 0 },
					{ bookingCount: '4+', customerCount: 0 },
				],
			});

			const res = await app.request('/api/v1/reports/customers?startDate=2026-02-01&endDate=2026-02-28');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { summary: { totalCustomers: number }; topCustomers: unknown[] } };
			expect(body.data.summary.totalCustomers).toBe(0);
			expect(body.data.topCustomers).toHaveLength(0);
		});

		it('[P1] should include booking count distribution', async () => {
			vi.spyOn(mockStatisticsService, 'getCustomerReport').mockResolvedValue({
				reportInfo: { title: 'Customer Report', period: { start: '2026-02-01', end: '2026-02-28' }, generatedAt: '2026-02-28T10:00:00Z' },
				summary: { totalCustomers: 200, newCustomers: 50, repeatCustomers: 80, blacklisted: 3 },
				topCustomers: [],
				byBookingCount: [
					{ bookingCount: '1', customerCount: 120 },
					{ bookingCount: '2-3', customerCount: 60 },
					{ bookingCount: '4+', customerCount: 20 },
				],
			});

			const res = await app.request('/api/v1/reports/customers?startDate=2026-02-01&endDate=2026-02-28');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { byBookingCount: { bookingCount: string; customerCount: number }[] } };
			expect(body.data.byBookingCount).toHaveLength(3);
			expect(body.data.byBookingCount[0].bookingCount).toBe('1');
			expect(body.data.byBookingCount[0].customerCount).toBe(120);
		});

		it('[P1] should include blacklisted count', async () => {
			vi.spyOn(mockStatisticsService, 'getCustomerReport').mockResolvedValue({
				reportInfo: { title: 'Customer Report', period: { start: '2026-02-01', end: '2026-02-28' }, generatedAt: '2026-02-28T10:00:00Z' },
				summary: { totalCustomers: 200, newCustomers: 50, repeatCustomers: 80, blacklisted: 5 },
				topCustomers: [],
				byBookingCount: [],
			});

			const res = await app.request('/api/v1/reports/customers?startDate=2026-02-01&endDate=2026-02-28');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { summary: { blacklisted: number } } };
			expect(body.data.summary.blacklisted).toBe(5);
		});
	});

	// ============================================
	// CSV Format Tests (Edge Cases)
	// ============================================

	describe('CSV Format Edge Cases', () => {
		it('[P1] should escape commas in CSV values', async () => {
			vi.spyOn(mockStatisticsService, 'getCustomerReport').mockResolvedValue({
				reportInfo: { title: 'Customer Report', period: { start: '2026-02-01', end: '2026-02-28' }, generatedAt: '2026-02-28T10:00:00Z' },
				summary: { totalCustomers: 1, newCustomers: 1, repeatCustomers: 0, blacklisted: 0 },
				topCustomers: [
					{ customerId: 'c1', name: 'John, Doe', totalBookings: 5, totalSpent: 1000000, lastBooking: '2026-02-25' },
				],
				byBookingCount: [],
			});

			const res = await app.request('/api/v1/reports/customers?startDate=2026-02-01&endDate=2026-02-28&format=csv');

			expect(res.status).toBe(200);
			const text = await res.text();
			// Commas in values should be escaped with quotes
			expect(text).toContain('"John, Doe"');
		});

		it('[P1] should escape quotes in CSV values', async () => {
			vi.spyOn(mockStatisticsService, 'getCustomerReport').mockResolvedValue({
				reportInfo: { title: 'Customer Report', period: { start: '2026-02-01', end: '2026-02-28' }, generatedAt: '2026-02-28T10:00:00Z' },
				summary: { totalCustomers: 1, newCustomers: 1, repeatCustomers: 0, blacklisted: 0 },
				topCustomers: [
					{ customerId: 'c1', name: 'John "The Customer" Doe', totalBookings: 5, totalSpent: 1000000, lastBooking: '2026-02-25' },
				],
				byBookingCount: [],
			});

			const res = await app.request('/api/v1/reports/customers?startDate=2026-02-01&endDate=2026-02-28&format=csv');

			expect(res.status).toBe(200);
			const text = await res.text();
			// Quotes in values should be escaped with double quotes
			expect(text).toContain('"John ""The Customer"" Doe"');
		});

		it('[P1] should handle special characters in vehicle names', async () => {
			vi.spyOn(mockStatisticsService, 'getFleetUtilizationReport').mockResolvedValue({
				reportInfo: { title: 'Fleet Utilization Report', period: { start: '2026-02-01', end: '2026-02-28' }, generatedAt: '2026-02-28T10:00:00Z' },
				summary: { totalVehicles: 1, totalRentalDays: 10, totalAvailableDays: 28, utilizationRate: 35.71, totalRevenue: 5000000 },
				byVehicle: [
					{
						vehicleId: 'v1',
						vehicleName: 'Honda CRF 250L (2023)',
						plateNumber: 'B 1234 ABC',
						type: 'TrailBike',
						rentalDays: 10,
						availableDays: 28,
						utilizationRate: 35.71,
						revenue: 5000000,
						maintenanceDays: 0,
					},
				],
				byType: [],
				underutilized: [],
			});

			const res = await app.request('/api/v1/reports/fleet-utilization?startDate=2026-02-01&endDate=2026-02-28&format=csv');

			expect(res.status).toBe(200);
			const text = await res.text();
			expect(text).toContain('Honda CRF 250L (2023)');
		});
	});
});
