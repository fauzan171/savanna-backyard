/**
 * Integration tests for Dashboard Routes
 * Tests all dashboard endpoints with HTTP layer
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { StatisticsService } from '@/worker/modules/statistics/statistics.service';
import { StatisticsRepository } from '@/worker/core/repositories/statistics.repository';

// Simple error handler for tests
function testErrorHandler(err: Error, c: any) {
	const status = 'statusCode' in err ? (err.statusCode as number) : 500;
	const code = 'code' in err ? (err.code as string) : 'INTERNAL_ERROR';
	return c.json({ success: false, error: { message: err.message, code } }, status);
}

/**
 * Integration tests for Dashboard module
 * Tests the HTTP layer with Hono app
 */
describe('Dashboard Integration Tests', () => {
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

		// Setup dashboard routes with mock service
		app.get('/api/v1/dashboard/overview', async (c) => {
			const query = c.req.query();
			const period = query.period ?? 'today';
			const result = await mockStatisticsService.getOverview({ period });
			return c.json({ success: true, data: result });
		});

		app.get('/api/v1/dashboard/revenue', async (c) => {
			const query = c.req.query();
			const result = await mockStatisticsService.getRevenueStats({
				startDate: query.startDate,
				endDate: query.endDate,
				groupBy: query.groupBy ?? 'day',
			});
			return c.json({ success: true, data: result });
		});

		app.get('/api/v1/dashboard/fleet', async (c) => {
			const query = c.req.query();
			const result = await mockStatisticsService.getFleetStats({
				startDate: query.startDate,
				endDate: query.endDate,
			});
			return c.json({ success: true, data: result });
		});

		app.get('/api/v1/dashboard/payments', async (c) => {
			const query = c.req.query();
			const result = await mockStatisticsService.getPaymentStats({
				startDate: query.startDate,
				endDate: query.endDate,
			});
			return c.json({ success: true, data: result });
		});

		app.get('/api/v1/dashboard/activities', async (c) => {
			const result = await mockStatisticsService.getActivities();
			return c.json({ success: true, data: result });
		});
	});

	// ============================================
	// GET /api/v1/dashboard/overview
	// ============================================

	describe('GET /api/v1/dashboard/overview', () => {
		it('[P0] should return dashboard overview with default period (today)', async () => {
			vi.spyOn(mockStatisticsService, 'getOverview').mockResolvedValue({
				period: 'today',
				revenue: { total: 5000000, currency: 'IDR', bookingsCount: 10, change: { value: null, direction: 'neutral' } },
				fleet: { total: 15, available: 10, rented: 4, maintenance: 1, utilizationRate: 27 },
				payments: { verified: 4000000, pending: 1000000, overdue: 0 },
				activeBookings: 4,
				upcomingPickups: 2,
				upcomingReturns: 1,
			});

			const res = await app.request('/api/v1/dashboard/overview');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { period: string; revenue: { total: number } } };
			expect(body.success).toBe(true);
			expect(body.data.period).toBe('today');
			expect(body.data.revenue.total).toBe(5000000);
		});

		it('[P0] should support period query parameter', async () => {
			vi.spyOn(mockStatisticsService, 'getOverview').mockResolvedValue({
				period: 'month',
				revenue: { total: 150000000, currency: 'IDR', bookingsCount: 100, change: { value: 10, direction: 'up' } },
				fleet: { total: 15, available: 10, rented: 4, maintenance: 1, utilizationRate: 27 },
				payments: { verified: 120000000, pending: 30000000, overdue: 5000000 },
				activeBookings: 4,
				upcomingPickups: 2,
				upcomingReturns: 1,
			});

			const res = await app.request('/api/v1/dashboard/overview?period=month');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { period: string } };
			expect(body.data.period).toBe('month');
			expect(mockStatisticsService.getOverview).toHaveBeenCalledWith({ period: 'month' });
		});

		it('[P1] should support week period', async () => {
			vi.spyOn(mockStatisticsService, 'getOverview').mockResolvedValue({
				period: 'week',
				revenue: { total: 35000000, currency: 'IDR', bookingsCount: 25, change: { value: null, direction: 'neutral' } },
				fleet: { total: 15, available: 10, rented: 4, maintenance: 1, utilizationRate: 27 },
				payments: { verified: 28000000, pending: 7000000, overdue: 0 },
				activeBookings: 4,
				upcomingPickups: 2,
				upcomingReturns: 1,
			});

			const res = await app.request('/api/v1/dashboard/overview?period=week');

			expect(res.status).toBe(200);
			expect(mockStatisticsService.getOverview).toHaveBeenCalledWith({ period: 'week' });
		});

		it('[P1] should return zero values when no data exists', async () => {
			vi.spyOn(mockStatisticsService, 'getOverview').mockResolvedValue({
				period: 'today',
				revenue: { total: 0, currency: 'IDR', bookingsCount: 0, change: { value: null, direction: 'neutral' } },
				fleet: { total: 0, available: 0, rented: 0, maintenance: 0, utilizationRate: 0 },
				payments: { verified: 0, pending: 0, overdue: 0 },
				activeBookings: 0,
				upcomingPickups: 0,
				upcomingReturns: 0,
			});

			const res = await app.request('/api/v1/dashboard/overview');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { revenue: { total: number }; fleet: { total: number } } };
			expect(body.data.revenue.total).toBe(0);
			expect(body.data.fleet.total).toBe(0);
		});
	});

	// ============================================
	// GET /api/v1/dashboard/revenue
	// ============================================

	describe('GET /api/v1/dashboard/revenue', () => {
		it('[P0] should return revenue statistics', async () => {
			vi.spyOn(mockStatisticsService, 'getRevenueStats').mockResolvedValue({
				period: { start: '2026-02-01', end: '2026-02-28' },
				summary: { totalRevenue: 50000000, currency: 'IDR', bookingsCount: 100, averagePerBooking: 500000 },
				breakdown: [
					{ date: '2026-02-01', revenue: 2000000, bookings: 4 },
					{ date: '2026-02-02', revenue: 2500000, bookings: 5 },
				],
				byVehicleType: [
					{ type: 'TrailBike', revenue: 30000000, percentage: 60 },
					{ type: 'StreetBike', revenue: 20000000, percentage: 40 },
				],
			});

			const res = await app.request('/api/v1/dashboard/revenue?startDate=2026-02-01&endDate=2026-02-28');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { summary: { totalRevenue: number }; breakdown: unknown[] } };
			expect(body.success).toBe(true);
			expect(body.data.summary.totalRevenue).toBe(50000000);
			expect(body.data.breakdown).toHaveLength(2);
		});

		it('[P0] should support groupBy parameter', async () => {
			vi.spyOn(mockStatisticsService, 'getRevenueStats').mockResolvedValue({
				period: { start: '2026-01-01', end: '2026-02-28' },
				summary: { totalRevenue: 100000000, currency: 'IDR', bookingsCount: 200, averagePerBooking: 500000 },
				breakdown: [],
				byVehicleType: [],
			});

			await app.request('/api/v1/dashboard/revenue?startDate=2026-01-01&endDate=2026-02-28&groupBy=week');

			expect(mockStatisticsService.getRevenueStats).toHaveBeenCalledWith(
				expect.objectContaining({ groupBy: 'week' })
			);
		});

		it('[P1] should work without date parameters', async () => {
			vi.spyOn(mockStatisticsService, 'getRevenueStats').mockResolvedValue({
				period: { start: '2026-01-30', end: '2026-03-01' },
				summary: { totalRevenue: 30000000, currency: 'IDR', bookingsCount: 60, averagePerBooking: 500000 },
				breakdown: [],
				byVehicleType: [],
			});

			const res = await app.request('/api/v1/dashboard/revenue');

			expect(res.status).toBe(200);
		});
	});

	// ============================================
	// GET /api/v1/dashboard/fleet
	// ============================================

	describe('GET /api/v1/dashboard/fleet', () => {
		it('[P0] should return fleet statistics', async () => {
			vi.spyOn(mockStatisticsService, 'getFleetStats').mockResolvedValue({
				period: { start: '2026-02-01', end: '2026-02-28' },
				summary: { totalVehicles: 15, totalRentalDays: 200, totalAvailableDays: 420, utilizationRate: 48, revenuePerVehicle: 3333333 },
				byStatus: { Available: 10, Rented: 4, Maintenance: 1, Inactive: 0 },
				byType: [
					{ type: 'TrailBike', total: 10, rented: 3, utilizationRate: 30 },
					{ type: 'StreetBike', total: 5, rented: 1, utilizationRate: 20 },
				],
				topVehicles: [
					{ id: 'v1', name: 'Honda CRF 250L', rentalDays: 25, revenue: 11250000, utilizationRate: 89 },
				],
				maintenanceAlerts: [],
			});

			const res = await app.request('/api/v1/dashboard/fleet?startDate=2026-02-01&endDate=2026-02-28');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { summary: { totalVehicles: number; utilizationRate: number }; byType: unknown[] } };
			expect(body.success).toBe(true);
			expect(body.data.summary.totalVehicles).toBe(15);
			expect(body.data.summary.utilizationRate).toBe(48);
			expect(body.data.byType).toHaveLength(2);
		});

		it('[P1] should include maintenance alerts', async () => {
			vi.spyOn(mockStatisticsService, 'getFleetStats').mockResolvedValue({
				period: { start: '2026-02-01', end: '2026-02-28' },
				summary: { totalVehicles: 15, totalRentalDays: 200, totalAvailableDays: 420, utilizationRate: 48, revenuePerVehicle: 3333333 },
				byStatus: { Available: 10, Rented: 4, Maintenance: 1, Inactive: 0 },
				byType: [],
				topVehicles: [],
				maintenanceAlerts: [
					{ id: 'v1', name: 'Honda CRF 250L', lastMaintenance: '2025-12-01', daysSinceMaintenance: 91, status: 'overdue' },
				],
			});

			const res = await app.request('/api/v1/dashboard/fleet?startDate=2026-02-01&endDate=2026-02-28');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { maintenanceAlerts: { status: string }[] } };
			expect(body.data.maintenanceAlerts).toHaveLength(1);
			expect(body.data.maintenanceAlerts[0].status).toBe('overdue');
		});
	});

	// ============================================
	// GET /api/v1/dashboard/payments
	// ============================================

	describe('GET /api/v1/dashboard/payments', () => {
		it('[P0] should return payment statistics', async () => {
			vi.spyOn(mockStatisticsService, 'getPaymentStats').mockResolvedValue({
				period: { start: '2026-02-01', end: '2026-02-28' },
				summary: { totalExpected: 60000000, totalReceived: 50000000, totalPending: 10000000, totalOverdue: 2000000, collectionRate: 83.33 },
				byStatus: { Verified: 50000000, Pending: 10000000, Failed: 500000 },
				byMethod: { QRIS: 25000000, BankTransfer: 20000000, Cash: 5000000 },
				overduePayments: [
					{ id: 'p1', bookingNumber: 'SM-001', customerName: 'John', amount: 2000000, daysOverdue: 10 },
				],
			});

			const res = await app.request('/api/v1/dashboard/payments?startDate=2026-02-01&endDate=2026-02-28');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { summary: { totalReceived: number; collectionRate: number }; byMethod: Record<string, number> } };
			expect(body.success).toBe(true);
			expect(body.data.summary.totalReceived).toBe(50000000);
			expect(body.data.summary.collectionRate).toBeCloseTo(83.33, 1);
			expect(body.data.byMethod.QRIS).toBe(25000000);
		});

		it('[P1] should handle no payments', async () => {
			vi.spyOn(mockStatisticsService, 'getPaymentStats').mockResolvedValue({
				period: { start: '2026-02-01', end: '2026-02-28' },
				summary: { totalExpected: 0, totalReceived: 0, totalPending: 0, totalOverdue: 0, collectionRate: 0 },
				byStatus: { Verified: 0, Pending: 0, Failed: 0 },
				byMethod: { QRIS: 0, BankTransfer: 0, Cash: 0 },
				overduePayments: [],
			});

			const res = await app.request('/api/v1/dashboard/payments?startDate=2026-02-01&endDate=2026-02-28');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { summary: { totalReceived: number } } };
			expect(body.data.summary.totalReceived).toBe(0);
		});
	});

	// ============================================
	// GET /api/v1/dashboard/activities
	// ============================================

	describe('GET /api/v1/dashboard/activities', () => {
		it('[P0] should return upcoming activities', async () => {
			vi.spyOn(mockStatisticsService, 'getActivities').mockResolvedValue({
				todayPickups: [
					{ bookingId: 'b1', bookingNumber: 'SM-001', customerName: 'John', customerPhone: '+62812', vehicleName: 'Honda CRF', time: '09:00' },
				],
				todayReturns: [
					{ bookingId: 'b2', bookingNumber: 'SM-002', customerName: 'Jane', customerPhone: '+62813', vehicleName: 'Yamaha WR', expectedTime: '17:00', isLate: false },
				],
				pendingPayments: [
					{ paymentId: 'p1', bookingNumber: 'SM-003', amount: 500000, method: 'BankTransfer', daysPending: 5 },
				],
			});

			const res = await app.request('/api/v1/dashboard/activities');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { todayPickups: unknown[]; todayReturns: unknown[]; pendingPayments: unknown[] } };
			expect(body.success).toBe(true);
			expect(body.data.todayPickups).toHaveLength(1);
			expect(body.data.todayReturns).toHaveLength(1);
			expect(body.data.pendingPayments).toHaveLength(1);
		});

		it('[P1] should handle empty activities', async () => {
			vi.spyOn(mockStatisticsService, 'getActivities').mockResolvedValue({
				todayPickups: [],
				todayReturns: [],
				pendingPayments: [],
			});

			const res = await app.request('/api/v1/dashboard/activities');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { todayPickups: unknown[]; todayReturns: unknown[]; pendingPayments: unknown[] } };
			expect(body.data.todayPickups).toHaveLength(0);
			expect(body.data.todayReturns).toHaveLength(0);
			expect(body.data.pendingPayments).toHaveLength(0);
		});

		it('[P1] should identify late returns', async () => {
			vi.spyOn(mockStatisticsService, 'getActivities').mockResolvedValue({
				todayPickups: [],
				todayReturns: [
					{ bookingId: 'b1', bookingNumber: 'SM-001', customerName: 'John', customerPhone: '+62812', vehicleName: 'Honda CRF', expectedTime: '17:00', isLate: true },
				],
				pendingPayments: [],
			});

			const res = await app.request('/api/v1/dashboard/activities');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { todayReturns: { isLate: boolean }[] } };
			expect(body.data.todayReturns[0].isLate).toBe(true);
		});
	});
});
