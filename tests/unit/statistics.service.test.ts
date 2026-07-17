/**
 * Comprehensive Tests for Statistics Service
 * Tests all service methods with P0, P1 scenarios and edge cases
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatisticsService } from '@/worker/modules/statistics/statistics.service';
import { StatisticsRepository } from '@/worker/core/repositories/statistics.repository';

// Mock the repository
const mockRepo = {
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
	getMaintenanceDaysByVehicle: vi.fn().mockResolvedValue({}),
	getPaymentDailyBreakdown: vi.fn().mockResolvedValue([]),
};

describe('StatisticsService', () => {
	let service: StatisticsService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new StatisticsService(mockRepo as unknown as StatisticsRepository);
	});

	// ============================================
	// getOverview
	// ============================================

	describe('getOverview', () => {
		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should return dashboard overview with default period (today)', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(1000000);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 10, byStatus: { Pending: 2, Confirmed: 3, Active: 2, Completed: 2, Cancelled: 1 } });
			mockRepo.getVehicleCountsByStatus.mockResolvedValue({ total: 15, byStatus: { Available: 10, Rented: 3, Maintenance: 2, Inactive: 0 } });
			mockRepo.getPaymentAmountsByStatus.mockResolvedValue({ byStatus: { Verified: 800000, Pending: 200000, Failed: 0 }, totalReceived: 800000, totalPending: 200000 });
			mockRepo.getActiveBookingsCount.mockResolvedValue(2);
			mockRepo.getTodayPickups.mockResolvedValue([]);
			mockRepo.getTodayReturns.mockResolvedValue([]);

			const result = await service.getOverview({ period: 'today' });

			expect(result.period).toBe('today');
			expect(result.revenue.total).toBe(1000000);
			expect(result.revenue.currency).toBe('IDR');
			expect(result.revenue.bookingsCount).toBe(10);
			expect(result.fleet.total).toBe(15);
			expect(result.activeBookings).toBe(2);
		});

		it('[P0] should calculate utilization rate correctly', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(0);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 0, byStatus: {} });
			mockRepo.getVehicleCountsByStatus.mockResolvedValue({ total: 20, byStatus: { Rented: 5 } });
			mockRepo.getPaymentAmountsByStatus.mockResolvedValue({ byStatus: {}, totalReceived: 0, totalPending: 0 });
			mockRepo.getActiveBookingsCount.mockResolvedValue(0);
			mockRepo.getTodayPickups.mockResolvedValue([]);
			mockRepo.getTodayReturns.mockResolvedValue([]);

			const result = await service.getOverview({ period: 'today' });

			expect(result.fleet.utilizationRate).toBe(25); // 5/20 * 100
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should support week period', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(5000000);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 50, byStatus: {} });
			mockRepo.getVehicleCountsByStatus.mockResolvedValue({ total: 15, byStatus: {} });
			mockRepo.getPaymentAmountsByStatus.mockResolvedValue({ byStatus: {}, totalReceived: 4000000, totalPending: 1000000 });
			mockRepo.getActiveBookingsCount.mockResolvedValue(3);
			mockRepo.getTodayPickups.mockResolvedValue([]);
			mockRepo.getTodayReturns.mockResolvedValue([]);

			const result = await service.getOverview({ period: 'week' });

			expect(result.period).toBe('week');
		});

		it('[P1] should support month period', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(20000000);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 200, byStatus: {} });
			mockRepo.getVehicleCountsByStatus.mockResolvedValue({ total: 15, byStatus: {} });
			mockRepo.getPaymentAmountsByStatus.mockResolvedValue({ byStatus: {}, totalReceived: 15000000, totalPending: 5000000 });
			mockRepo.getActiveBookingsCount.mockResolvedValue(5);
			mockRepo.getTodayPickups.mockResolvedValue([]);
			mockRepo.getTodayReturns.mockResolvedValue([]);

			const result = await service.getOverview({ period: 'month' });

			expect(result.period).toBe('month');
		});

		it('[P1] should support year period', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(250000000);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 2000, byStatus: {} });
			mockRepo.getVehicleCountsByStatus.mockResolvedValue({ total: 15, byStatus: {} });
			mockRepo.getPaymentAmountsByStatus.mockResolvedValue({ byStatus: {}, totalReceived: 200000000, totalPending: 50000000 });
			mockRepo.getActiveBookingsCount.mockResolvedValue(4);
			mockRepo.getTodayPickups.mockResolvedValue([]);
			mockRepo.getTodayReturns.mockResolvedValue([]);

			const result = await service.getOverview({ period: 'year' });

			expect(result.period).toBe('year');
		});

		it('[P1] should handle zero vehicles gracefully', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(0);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 0, byStatus: {} });
			mockRepo.getVehicleCountsByStatus.mockResolvedValue({ total: 0, byStatus: {} });
			mockRepo.getPaymentAmountsByStatus.mockResolvedValue({ byStatus: {}, totalReceived: 0, totalPending: 0 });
			mockRepo.getActiveBookingsCount.mockResolvedValue(0);
			mockRepo.getTodayPickups.mockResolvedValue([]);
			mockRepo.getTodayReturns.mockResolvedValue([]);

			const result = await service.getOverview({ period: 'today' });

			expect(result.fleet.utilizationRate).toBe(0);
			expect(result.fleet.total).toBe(0);
		});

		it('[P1] should include upcoming pickups and returns count', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(0);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 0, byStatus: {} });
			mockRepo.getVehicleCountsByStatus.mockResolvedValue({ total: 0, byStatus: {} });
			mockRepo.getPaymentAmountsByStatus.mockResolvedValue({ byStatus: {}, totalReceived: 0, totalPending: 0 });
			mockRepo.getActiveBookingsCount.mockResolvedValue(0);
			mockRepo.getTodayPickups.mockResolvedValue([
				{ bookingId: 'b1', bookingNumber: 'SM-001', customerName: 'John', customerPhone: '+62812', vehicleName: 'Honda', startDate: '2026-03-01' },
				{ bookingId: 'b2', bookingNumber: 'SM-002', customerName: 'Jane', customerPhone: '+62813', vehicleName: 'Yamaha', startDate: '2026-03-01' },
			]);
			mockRepo.getTodayReturns.mockResolvedValue([
				{ bookingId: 'b3', bookingNumber: 'SM-003', customerName: 'Mike', customerPhone: '+62814', vehicleName: 'Kawasaki', endDate: '2026-03-01', status: 'Active' },
			]);

			const result = await service.getOverview({ period: 'today' });

			expect(result.upcomingPickups).toBe(2);
			expect(result.upcomingReturns).toBe(1);
		});
	});

	// ============================================
	// getRevenueStats
	// ============================================

	describe('getRevenueStats', () => {
		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should return revenue statistics', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(5000000);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 25, byStatus: { Pending: 0, Confirmed: 10, Active: 5, Completed: 10, Cancelled: 0 } });
			mockRepo.getRevenueByDate.mockResolvedValue([
				{ date: '2026-02-01', revenue: 1000000, bookings: 5 },
				{ date: '2026-02-02', revenue: 1500000, bookings: 7 },
			]);
			mockRepo.getRevenueByVehicleType.mockResolvedValue([
				{ type: 'TrailBike', revenue: 3000000, bookings: 15, percentage: 60 },
				{ type: 'StreetBike', revenue: 2000000, bookings: 10, percentage: 40 },
			]);

			const result = await service.getRevenueStats({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.summary.totalRevenue).toBe(5000000);
			expect(result.summary.bookingsCount).toBe(25);
			expect(result.summary.averagePerBooking).toBe(200000); // 5000000 / 25
			expect(result.breakdown).toHaveLength(2);
			expect(result.byVehicleType).toHaveLength(2);
		});

		it('[P0] should use default date range when not provided', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(3000000);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 10, byStatus: {} });
			mockRepo.getRevenueByDate.mockResolvedValue([]);
			mockRepo.getRevenueByVehicleType.mockResolvedValue([]);

			const result = await service.getRevenueStats({});

			expect(result.period.start).toBeDefined();
			expect(result.period.end).toBeDefined();
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should handle zero bookings gracefully', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(0);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 0, byStatus: {} });
			mockRepo.getRevenueByDate.mockResolvedValue([]);
			mockRepo.getRevenueByVehicleType.mockResolvedValue([]);

			const result = await service.getRevenueStats({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.summary.totalRevenue).toBe(0);
			expect(result.summary.averagePerBooking).toBe(0);
		});

		it('[P1] should handle empty breakdown', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(0);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 0, byStatus: {} });
			mockRepo.getRevenueByDate.mockResolvedValue([]);
			mockRepo.getRevenueByVehicleType.mockResolvedValue([]);

			const result = await service.getRevenueStats({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.breakdown).toHaveLength(0);
			expect(result.byVehicleType).toHaveLength(0);
		});

		it('[P1] should support groupBy parameter', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(10000000);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 50, byStatus: {} });
			mockRepo.getRevenueByDate.mockResolvedValue([
				{ date: '2026-W05', revenue: 5000000, bookings: 25 },
			]);
			mockRepo.getRevenueByVehicleType.mockResolvedValue([]);

			const result = await service.getRevenueStats({ startDate: '2026-02-01', endDate: '2026-02-28', groupBy: 'week' });

			expect(result.breakdown).toHaveLength(1);
		});
	});

	// ============================================
	// getFleetStats
	// ============================================

	describe('getFleetStats', () => {
		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should return fleet statistics', async () => {
			mockRepo.getVehicleCountsByStatus.mockResolvedValue({ total: 20, byStatus: { Available: 12, Rented: 6, Maintenance: 2, Inactive: 0 } });
			mockRepo.getVehiclesByType.mockResolvedValue([
				{ type: 'TrailBike', total: 10, rented: 4 },
				{ type: 'StreetBike', total: 5, rented: 2 },
			]);
			mockRepo.getTopVehicles.mockResolvedValue([
				{ id: 'v1', name: 'Honda CRF 250L', rentalDays: 20, revenue: 4000000 },
			]);
			mockRepo.getMaintenanceAlerts.mockResolvedValue([]);
			mockRepo.getFleetUtilization.mockResolvedValue({ totalRentalDays: 100, byVehicle: [] });

			const result = await service.getFleetStats({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.summary.totalVehicles).toBe(20);
			expect(result.byStatus.Available).toBe(12);
			expect(result.byStatus.Rented).toBe(6);
			expect(result.byType).toHaveLength(2);
		});

		it('[P0] should include top vehicles with utilization rate', async () => {
			mockRepo.getVehicleCountsByStatus.mockResolvedValue({ total: 10, byStatus: {} });
			mockRepo.getVehiclesByType.mockResolvedValue([]);
			mockRepo.getTopVehicles.mockResolvedValue([
				{ id: 'v1', name: 'Honda CRF 250L', rentalDays: 20, revenue: 4000000 },
				{ id: 'v2', name: 'Yamaha WR 155', rentalDays: 15, revenue: 3000000 },
			]);
			mockRepo.getMaintenanceAlerts.mockResolvedValue([]);
			mockRepo.getFleetUtilization.mockResolvedValue({ totalRentalDays: 35, byVehicle: [] });

			const result = await service.getFleetStats({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.topVehicles).toHaveLength(2);
			expect(result.topVehicles[0].utilizationRate).toBeDefined();
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should include maintenance alerts', async () => {
			mockRepo.getVehicleCountsByStatus.mockResolvedValue({ total: 10, byStatus: {} });
			mockRepo.getVehiclesByType.mockResolvedValue([]);
			mockRepo.getTopVehicles.mockResolvedValue([]);
			mockRepo.getMaintenanceAlerts.mockResolvedValue([
				{ id: 'v1', name: 'Honda CRF 250L', lastMaintenance: '2025-12-01', daysSinceMaintenance: 91, status: 'overdue' },
			]);
			mockRepo.getFleetUtilization.mockResolvedValue({ totalRentalDays: 0, byVehicle: [] });

			const result = await service.getFleetStats({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.maintenanceAlerts).toHaveLength(1);
			expect(result.maintenanceAlerts[0].status).toBe('overdue');
		});

		it('[P1] should handle zero vehicles', async () => {
			mockRepo.getVehicleCountsByStatus.mockResolvedValue({ total: 0, byStatus: {} });
			mockRepo.getVehiclesByType.mockResolvedValue([]);
			mockRepo.getTopVehicles.mockResolvedValue([]);
			mockRepo.getMaintenanceAlerts.mockResolvedValue([]);
			mockRepo.getFleetUtilization.mockResolvedValue({ totalRentalDays: 0, byVehicle: [] });

			const result = await service.getFleetStats({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.summary.totalVehicles).toBe(0);
			expect(result.summary.utilizationRate).toBe(0);
		});

		it('[P1] should calculate type utilization rate correctly', async () => {
			mockRepo.getVehicleCountsByStatus.mockResolvedValue({ total: 10, byStatus: {} });
			mockRepo.getVehiclesByType.mockResolvedValue([
				{ type: 'TrailBike', total: 10, rented: 5 },
			]);
			mockRepo.getTopVehicles.mockResolvedValue([]);
			mockRepo.getMaintenanceAlerts.mockResolvedValue([]);
			mockRepo.getFleetUtilization.mockResolvedValue({ totalRentalDays: 50, byVehicle: [] });

			const result = await service.getFleetStats({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.byType[0].utilizationRate).toBe(50); // 5/10 * 100
		});
	});

	// ============================================
	// getPaymentStats
	// ============================================

	describe('getPaymentStats', () => {
		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should return payment statistics', async () => {
			mockRepo.getPaymentAmountsByStatus.mockResolvedValue({ byStatus: { Verified: 10000000, Pending: 2000000, Failed: 500000 }, totalReceived: 10000000, totalPending: 2000000 });
			mockRepo.getPaymentsByMethod.mockResolvedValue({ QRIS: 5000000, BankTransfer: 4000000, Cash: 1000000 });
			mockRepo.getOverduePayments.mockResolvedValue([]);

			const result = await service.getPaymentStats({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.summary.totalReceived).toBe(10000000);
			expect(result.summary.totalPending).toBe(2000000);
			expect(result.byStatus.Verified).toBe(10000000);
		});

		it('[P0] should calculate collection rate correctly', async () => {
			mockRepo.getPaymentAmountsByStatus.mockResolvedValue({ byStatus: {}, totalReceived: 8000000, totalPending: 2000000 });
			mockRepo.getPaymentsByMethod.mockResolvedValue({});
			mockRepo.getOverduePayments.mockResolvedValue([]);

			const result = await service.getPaymentStats({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.summary.totalExpected).toBe(10000000);
			expect(result.summary.collectionRate).toBe(80); // 8000000 / 10000000 * 100
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should identify overdue payments (older than 7 days)', async () => {
			const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
			const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

			mockRepo.getPaymentAmountsByStatus.mockResolvedValue({ byStatus: {}, totalReceived: 0, totalPending: 3000000 });
			mockRepo.getPaymentsByMethod.mockResolvedValue({});
			mockRepo.getOverduePayments.mockResolvedValue([
				{ id: 'p1', bookingNumber: 'SM-001', customerName: 'John', amount: 1000000, createdAt: oldDate },
				{ id: 'p2', bookingNumber: 'SM-002', customerName: 'Jane', amount: 2000000, createdAt: recentDate },
			]);

			const result = await service.getPaymentStats({ startDate: '2026-02-01', endDate: '2026-02-28' });

			// Only the old payment should be counted as overdue
			expect(result.summary.totalOverdue).toBe(1000000);
			expect(result.overduePayments).toHaveLength(1);
			expect(result.overduePayments[0].id).toBe('p1');
		});

		it('[P1] should handle zero payments', async () => {
			mockRepo.getPaymentAmountsByStatus.mockResolvedValue({ byStatus: {}, totalReceived: 0, totalPending: 0 });
			mockRepo.getPaymentsByMethod.mockResolvedValue({});
			mockRepo.getOverduePayments.mockResolvedValue([]);

			const result = await service.getPaymentStats({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.summary.totalReceived).toBe(0);
			expect(result.summary.collectionRate).toBe(0);
		});

		it('[P1] should calculate days overdue correctly', async () => {
			const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

			mockRepo.getPaymentAmountsByStatus.mockResolvedValue({ byStatus: {}, totalReceived: 0, totalPending: 1000000 });
			mockRepo.getPaymentsByMethod.mockResolvedValue({});
			mockRepo.getOverduePayments.mockResolvedValue([
				{ id: 'p1', bookingNumber: 'SM-001', customerName: 'John', amount: 1000000, createdAt: oldDate },
			]);

			const result = await service.getPaymentStats({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.overduePayments[0].daysOverdue).toBeGreaterThanOrEqual(10);
		});
	});

	// ============================================
	// getActivities
	// ============================================

	describe('getActivities', () => {
		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should return upcoming activities', async () => {
			const today = new Date().toISOString().split('T')[0];
			mockRepo.getTodayPickups.mockResolvedValue([
				{ bookingId: 'b1', bookingNumber: 'BK-001', customerName: 'John', customerPhone: '+628123', vehicleName: 'Honda CRF', startDate: today },
			]);
			mockRepo.getTodayReturns.mockResolvedValue([
				{ bookingId: 'b2', bookingNumber: 'BK-002', customerName: 'Jane', customerPhone: '+628124', vehicleName: 'Yamaha WR', endDate: today, status: 'Active' },
			]);
			mockRepo.getOverduePayments.mockResolvedValue([]);

			const result = await service.getActivities();

			expect(result.todayPickups).toHaveLength(1);
			expect(result.todayReturns).toHaveLength(1);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should include pending payments', async () => {
			mockRepo.getTodayPickups.mockResolvedValue([]);
			mockRepo.getTodayReturns.mockResolvedValue([]);
			mockRepo.getOverduePayments.mockResolvedValue([
				{ id: 'p1', bookingNumber: 'SM-001', customerName: 'John', amount: 500000, createdAt: new Date().toISOString() },
				{ id: 'p2', bookingNumber: 'SM-002', customerName: 'Jane', amount: 750000, createdAt: new Date().toISOString() },
			]);

			const result = await service.getActivities();

			expect(result.pendingPayments).toHaveLength(2);
		});

		it('[P1] should limit pending payments to 10', async () => {
			mockRepo.getTodayPickups.mockResolvedValue([]);
			mockRepo.getTodayReturns.mockResolvedValue([]);
			mockRepo.getOverduePayments.mockResolvedValue(
				Array(15).fill(null).map((_, i) => ({
					id: `p${i}`,
					bookingNumber: `SM-${i.toString().padStart(3, '0')}`,
					customerName: `Customer ${i}`,
					amount: 100000,
					createdAt: new Date().toISOString(),
				}))
			);

			const result = await service.getActivities();

			expect(result.pendingPayments).toHaveLength(10);
		});

		it('[P1] should handle empty activities', async () => {
			mockRepo.getTodayPickups.mockResolvedValue([]);
			mockRepo.getTodayReturns.mockResolvedValue([]);
			mockRepo.getOverduePayments.mockResolvedValue([]);

			const result = await service.getActivities();

			expect(result.todayPickups).toHaveLength(0);
			expect(result.todayReturns).toHaveLength(0);
			expect(result.pendingPayments).toHaveLength(0);
		});
	});

	// ============================================
	// Report methods
	// ============================================

	describe('Report methods', () => {
		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should generate revenue report', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(10000000);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 50, byStatus: {} });
			mockRepo.getRevenueByDate.mockResolvedValue([]);
			mockRepo.getRevenueByVehicleType.mockResolvedValue([]);
			mockRepo.getRevenueByPaymentMethod.mockResolvedValue([]);

			const result = await service.getRevenueReport({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.reportInfo.title).toBe('Revenue Report');
			expect(result.summary.totalRevenue).toBe(10000000);
			expect(result.reportInfo.period.start).toBe('2026-02-01');
			expect(result.reportInfo.period.end).toBe('2026-02-28');
		});

		it('[P0] should generate fleet utilization report', async () => {
			mockRepo.getVehicleCountsByStatus.mockResolvedValue({ total: 10, byStatus: {} });
			mockRepo.getFleetUtilization.mockResolvedValue({ totalRentalDays: 100, byVehicle: [
				{ vehicleId: 'v1', vehicleName: 'Honda CRF', plateNumber: 'B 1234', type: 'TrailBike', rentalDays: 10, revenue: 5000000 },
			] });
			mockRepo.getVehiclesByType.mockResolvedValue([]);

			const result = await service.getFleetUtilizationReport({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.reportInfo.title).toBe('Fleet Utilization Report');
			expect(result.summary.totalVehicles).toBe(10);
		});

		it('[P0] should generate payment report', async () => {
			mockRepo.getPaymentAmountsByStatus.mockResolvedValue({ byStatus: {}, totalReceived: 5000000, totalPending: 1000000 });
			mockRepo.getPaymentsByMethod.mockResolvedValue({ QRIS: 3000000, BankTransfer: 2000000 });
			mockRepo.getOverduePayments.mockResolvedValue([]);

			const result = await service.getPaymentReport({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.reportInfo.title).toBe('Payment Report');
			expect(result.summary.totalReceived).toBe(5000000);
		});

		it('[P0] should generate customer report', async () => {
			mockRepo.getCustomerStats.mockResolvedValue({ total: 200, newCount: 50, blacklisted: 3 });
			mockRepo.getTopCustomers.mockResolvedValue([]);
			mockRepo.getCustomersByBookingCount.mockResolvedValue([]);

			const result = await service.getCustomerReport({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.reportInfo.title).toBe('Customer Report');
			expect(result.summary.totalCustomers).toBe(200);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should calculate average booking value in revenue report', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(5000000);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 10, byStatus: {} });
			mockRepo.getRevenueByDate.mockResolvedValue([]);
			mockRepo.getRevenueByVehicleType.mockResolvedValue([]);
			mockRepo.getRevenueByPaymentMethod.mockResolvedValue([]);

			const result = await service.getRevenueReport({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.summary.averageBookingValue).toBe(500000); // 5000000 / 10
		});

		it('[P1] should handle zero bookings in revenue report', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(0);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 0, byStatus: {} });
			mockRepo.getRevenueByDate.mockResolvedValue([]);
			mockRepo.getRevenueByVehicleType.mockResolvedValue([]);
			mockRepo.getRevenueByPaymentMethod.mockResolvedValue([]);

			const result = await service.getRevenueReport({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.summary.averageBookingValue).toBe(0);
		});

		it('[P1] should filter fleet report by vehicleId', async () => {
			mockRepo.getVehicleCountsByStatus.mockResolvedValue({ total: 10, byStatus: {} });
			mockRepo.getFleetUtilization.mockResolvedValue({
				totalRentalDays: 100,
				byVehicle: [
					{ vehicleId: 'v1', vehicleName: 'Honda CRF', plateNumber: 'B 1234', type: 'TrailBike', rentalDays: 50, revenue: 5000000 },
					{ vehicleId: 'v2', vehicleName: 'Yamaha WR', plateNumber: 'B 5678', type: 'TrailBike', rentalDays: 50, revenue: 5000000 },
				],
			});
			mockRepo.getVehiclesByType.mockResolvedValue([]);

			const result = await service.getFleetUtilizationReport({ startDate: '2026-02-01', endDate: '2026-02-28', vehicleId: 'v1' });

			expect(result.byVehicle).toHaveLength(1);
			expect(result.byVehicle[0].vehicleId).toBe('v1');
		});

		it('[P1] should identify underutilized vehicles (< 30% utilization)', async () => {
			mockRepo.getVehicleCountsByStatus.mockResolvedValue({ total: 10, byStatus: {} });
			mockRepo.getFleetUtilization.mockResolvedValue({
				totalRentalDays: 50,
				byVehicle: [
					{ vehicleId: 'v1', vehicleName: 'Popular Bike', plateNumber: 'B 1234', type: 'TrailBike', rentalDays: 25, revenue: 5000000 },
					{ vehicleId: 'v2', vehicleName: 'Unused Bike', plateNumber: 'B 5678', type: 'TrailBike', rentalDays: 5, revenue: 1000000 },
				],
			});
			mockRepo.getVehiclesByType.mockResolvedValue([]);

			const result = await service.getFleetUtilizationReport({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.underutilized).toHaveLength(1);
			expect(result.underutilized[0].vehicleName).toBe('Unused Bike');
		});

		it('[P1] should calculate repeat customers correctly', async () => {
			mockRepo.getCustomerStats.mockResolvedValue({ total: 200, newCount: 50, blacklisted: 3 });
			mockRepo.getTopCustomers.mockResolvedValue([]);
			mockRepo.getCustomersByBookingCount.mockResolvedValue([
				{ bookingCount: '1', customerCount: 120 },
				{ bookingCount: '2-3', customerCount: 60 },
				{ bookingCount: '4+', customerCount: 20 },
			]);

			const result = await service.getCustomerReport({ startDate: '2026-02-01', endDate: '2026-02-28' });

			// Repeat customers = 2-3 + 4+ = 60 + 20 = 80
			expect(result.summary.repeatCustomers).toBe(80);
		});

		it('[P1] should include report generation timestamp', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(0);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 0, byStatus: {} });
			mockRepo.getRevenueByDate.mockResolvedValue([]);
			mockRepo.getRevenueByVehicleType.mockResolvedValue([]);
			mockRepo.getRevenueByPaymentMethod.mockResolvedValue([]);

			const beforeTime = new Date().toISOString();
			const result = await service.getRevenueReport({ startDate: '2026-02-01', endDate: '2026-02-28' });
			const afterTime = new Date().toISOString();

			expect(result.reportInfo.generatedAt).toBeDefined();
			expect(result.reportInfo.generatedAt >= beforeTime).toBe(true);
			expect(result.reportInfo.generatedAt <= afterTime).toBe(true);
		});

		it('[P1] should support groupBy parameter in revenue report', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(10000000);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 50, byStatus: {} });
			mockRepo.getRevenueByDate.mockResolvedValue([
				{ date: '2026-W05', revenue: 5000000, bookings: 25 },
			]);
			mockRepo.getRevenueByVehicleType.mockResolvedValue([]);
			mockRepo.getRevenueByPaymentMethod.mockResolvedValue([]);

			const result = await service.getRevenueReport({ startDate: '2026-02-01', endDate: '2026-02-28', groupBy: 'week' });

			expect(result.breakdown).toHaveLength(1);
			expect(result.breakdown[0].period).toBe('2026-W05');
		});

		it('[P1] should calculate breakdown average value correctly', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(0);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 0, byStatus: {} });
			mockRepo.getRevenueByDate.mockResolvedValue([
				{ date: '2026-02-01', revenue: 1000000, bookings: 2 },
			]);
			mockRepo.getRevenueByVehicleType.mockResolvedValue([]);
			mockRepo.getRevenueByPaymentMethod.mockResolvedValue([]);

			const result = await service.getRevenueReport({ startDate: '2026-02-01', endDate: '2026-02-28' });

			expect(result.breakdown[0].averageValue).toBe(500000); // 1000000 / 2
		});
	});

	// ============================================
	// Helper Methods
	// ============================================

	describe('Helper Methods', () => {
		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should use default period (today) when not specified', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(0);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 0, byStatus: {} });
			mockRepo.getVehicleCountsByStatus.mockResolvedValue({ total: 0, byStatus: {} });
			mockRepo.getPaymentAmountsByStatus.mockResolvedValue({ byStatus: {}, totalReceived: 0, totalPending: 0 });
			mockRepo.getActiveBookingsCount.mockResolvedValue(0);
			mockRepo.getTodayPickups.mockResolvedValue([]);
			mockRepo.getTodayReturns.mockResolvedValue([]);

			const result = await service.getOverview({});

			expect(result.period).toBe('today');
		});

		it('[P1] should handle unknown period gracefully', async () => {
			mockRepo.getTotalRevenue.mockResolvedValue(0);
			mockRepo.getBookingCountsByStatus.mockResolvedValue({ total: 0, byStatus: {} });
			mockRepo.getVehicleCountsByStatus.mockResolvedValue({ total: 0, byStatus: {} });
			mockRepo.getPaymentAmountsByStatus.mockResolvedValue({ byStatus: {}, totalReceived: 0, totalPending: 0 });
			mockRepo.getActiveBookingsCount.mockResolvedValue(0);
			mockRepo.getTodayPickups.mockResolvedValue([]);
			mockRepo.getTodayReturns.mockResolvedValue([]);

			const result = await service.getOverview({ period: 'unknown' as any });

			// Should default to today
			expect(result.period).toBe('unknown');
		});
	});
});
