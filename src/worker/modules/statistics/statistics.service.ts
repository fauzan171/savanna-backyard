/**
 * Statistics Service
 * Business logic for dashboard and reports
 */
import { StatisticsRepository } from '@/worker/core/repositories/statistics.repository';
import type {
	DateRangeQuery,
	PeriodFilter,
	DashboardOverview,
	RevenueStats,
	FleetStats,
	PaymentStats,
	ActivitiesResult,
	ReportInfo,
	RevenueReport,
	FleetUtilizationReport,
	PaymentReport,
	CustomerReport,
} from './statistics.types';

export class StatisticsService {
	constructor(private repo: StatisticsRepository) {}

	// ============ Helper Methods ============

	/**
	 * Get date range from period filter
	 */
	private getDateRangeFromPeriod(period: string): { startDate: string; endDate: string } {
		const today = new Date();
		const endDate = today.toISOString().split('T')[0];
		let startDate: string;

		switch (period) {
			case 'today':
				startDate = endDate;
				break;
			case 'week': {
				const weekAgo = new Date(today);
				weekAgo.setDate(weekAgo.getDate() - 7);
				startDate = weekAgo.toISOString().split('T')[0];
				break;
			}
			case 'month': {
				const monthAgo = new Date(today);
				monthAgo.setMonth(monthAgo.getMonth() - 1);
				startDate = monthAgo.toISOString().split('T')[0];
				break;
			}
			case 'year': {
				const yearAgo = new Date(today);
				yearAgo.setFullYear(yearAgo.getFullYear() - 1);
				startDate = yearAgo.toISOString().split('T')[0];
				break;
			}
			default:
				startDate = endDate;
		}

		return { startDate, endDate };
	}

	/**
	 * Get report info object
	 */
	private getReportInfo(title: string, startDate?: string, endDate?: string): ReportInfo {
		return {
			title,
			period: {
				start: startDate ?? 'all',
				end: endDate ?? 'now',
			},
			generatedAt: new Date().toISOString(),
		};
	}

	// ============ Dashboard Methods ============

	/**
	 * Get dashboard overview
	 */
	async getOverview(query: PeriodFilter): Promise<DashboardOverview> {
		const { startDate, endDate } = this.getDateRangeFromPeriod(query.period ?? 'today');

		const [totalRevenue, bookingCounts, vehicleCounts, paymentAmounts, activeBookings, todayPickups, todayReturns] =
			await Promise.all([
				this.repo.getTotalRevenue(startDate, endDate),
				this.repo.getBookingCountsByStatus(startDate, endDate),
				this.repo.getVehicleCountsByStatus(),
				this.repo.getPaymentAmountsByStatus(startDate, endDate),
				this.repo.getActiveBookingsCount(),
				this.repo.getTodayPickups(),
				this.repo.getTodayReturns(),
			]);

		return {
			period: query.period ?? 'today',
			revenue: {
				total: totalRevenue,
				currency: 'IDR',
				bookingsCount: bookingCounts.total,
				change: {
					value: null, // Deferred
					direction: 'neutral',
				},
			},
			fleet: {
				total: vehicleCounts.total,
				available: vehicleCounts.byStatus['Available'] ?? 0,
				rented: vehicleCounts.byStatus['Rented'] ?? 0,
				maintenance: vehicleCounts.byStatus['Maintenance'] ?? 0,
				utilizationRate:
					vehicleCounts.total > 0
						? Math.round(((vehicleCounts.byStatus['Rented'] ?? 0) / vehicleCounts.total) * 100)
						: 0,
			},
			payments: {
				verified: paymentAmounts.totalReceived,
				pending: paymentAmounts.totalPending,
				overdue: 0, // Calculated from overdue payments
			},
			activeBookings,
			upcomingPickups: todayPickups.length,
			upcomingReturns: todayReturns.length,
		};
	}

	/**
	 * Get revenue statistics
	 */
	async getRevenueStats(query: DateRangeQuery & { groupBy?: 'day' | 'week' | 'month' }): Promise<RevenueStats> {
		const startDate = query.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		const endDate = query.endDate ?? new Date().toISOString().split('T')[0];
		const groupBy = query.groupBy ?? 'day';

		const [totalRevenue, bookingCounts, breakdown, byVehicleType] = await Promise.all([
			this.repo.getTotalRevenue(startDate, endDate),
			this.repo.getBookingCountsByStatus(startDate, endDate),
			this.repo.getRevenueByDate(startDate, endDate, groupBy),
			this.repo.getRevenueByVehicleType(startDate, endDate),
		]);

		return {
			period: { start: startDate, end: endDate },
			summary: {
				totalRevenue,
				currency: 'IDR',
				bookingsCount: bookingCounts.total,
				averagePerBooking: bookingCounts.total > 0 ? Math.round(totalRevenue / bookingCounts.total) : 0,
			},
			breakdown,
			byVehicleType,
		};
	}

	/**
	 * Get fleet statistics
	 */
	async getFleetStats(query: DateRangeQuery): Promise<FleetStats> {
		const startDate = query.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		const endDate = query.endDate ?? new Date().toISOString().split('T')[0];

		const [vehicleCounts, vehiclesByType, topVehicles, maintenanceAlerts, utilization] = await Promise.all([
			this.repo.getVehicleCountsByStatus(),
			this.repo.getVehiclesByType(),
			this.repo.getTopVehicles(startDate, endDate, 5),
			this.repo.getMaintenanceAlerts(),
			this.repo.getFleetUtilization(startDate, endDate),
		]);

		// Calculate days in period
		const daysInPeriod = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
		const totalAvailableDays = vehicleCounts.total * daysInPeriod;
		const utilizationRate = totalAvailableDays > 0 ? Math.round((utilization.totalRentalDays / totalAvailableDays) * 100) : 0;

		const byType = vehiclesByType.map((v) => ({
			type: v.type,
			total: v.total,
			rented: v.rented,
			utilizationRate: v.total > 0 ? Math.round((v.rented / v.total) * 100) : 0,
		}));

		const topVehiclesWithRate = topVehicles.map((v) => ({
			...v,
			utilizationRate: daysInPeriod > 0 ? Math.round((v.rentalDays / daysInPeriod) * 100) : 0,
		}));

		return {
			period: { start: startDate, end: endDate },
			summary: {
				totalVehicles: vehicleCounts.total,
				totalRentalDays: utilization.totalRentalDays,
				totalAvailableDays,
				utilizationRate,
				revenuePerVehicle: vehicleCounts.total > 0 ? Math.round(topVehicles.reduce((sum, v) => sum + v.revenue, 0) / vehicleCounts.total) : 0,
			},
			byStatus: vehicleCounts.byStatus,
			byType,
			topVehicles: topVehiclesWithRate,
			maintenanceAlerts,
		};
	}

	/**
	 * Get payment statistics
	 */
	async getPaymentStats(query: DateRangeQuery): Promise<PaymentStats> {
		const startDate = query.startDate;
		const endDate = query.endDate;

		const [paymentAmounts, byMethod, overduePayments] = await Promise.all([
			this.repo.getPaymentAmountsByStatus(startDate, endDate),
			this.repo.getPaymentsByMethod(startDate, endDate),
			this.repo.getOverduePayments(),
		]);

		// Calculate overdue amount (pending payments older than 7 days)
		const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
		const overdueAmount = overduePayments
			.filter((p) => new Date(p.createdAt) < sevenDaysAgo)
			.reduce((sum, p) => sum + p.amount, 0);

		const totalExpected = paymentAmounts.totalReceived + paymentAmounts.totalPending;
		const collectionRate = totalExpected > 0 ? Math.round((paymentAmounts.totalReceived / totalExpected) * 10000) / 100 : 0;

		return {
			period: {
				start: startDate ?? 'all',
				end: endDate ?? 'now',
			},
			summary: {
				totalExpected,
				totalReceived: paymentAmounts.totalReceived,
				totalPending: paymentAmounts.totalPending,
				totalOverdue: overdueAmount,
				collectionRate,
			},
			byStatus: paymentAmounts.byStatus,
			byMethod,
			overduePayments: overduePayments
				.filter((p) => new Date(p.createdAt) < sevenDaysAgo)
				.map((p) => ({
					id: p.id,
					bookingNumber: p.bookingNumber,
					customerName: p.customerName,
					amount: p.amount,
					daysOverdue: Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
				})),
		};
	}

	/**
	 * Get upcoming activities
	 */
	async getActivities(): Promise<ActivitiesResult> {
		const today = new Date().toISOString().split('T')[0];

		const [todayPickups, todayReturns, overduePayments] = await Promise.all([
			this.repo.getTodayPickups(),
			this.repo.getTodayReturns(),
			this.repo.getOverduePayments(),
		]);

		return {
			todayPickups: todayPickups.map((p) => ({
				bookingId: p.bookingId,
				bookingNumber: p.bookingNumber,
				customerName: p.customerName,
				customerPhone: p.customerPhone,
				vehicleName: p.vehicleName,
				time: p.startDate === today ? '09:00' : '', // Default pickup time
			})),
			todayReturns: todayReturns.map((r) => ({
				bookingId: r.bookingId,
				bookingNumber: r.bookingNumber,
				customerName: r.customerName,
				customerPhone: r.customerPhone,
				vehicleName: r.vehicleName,
				expectedTime: '17:00', // Default return time
				isLate: false, // Will be determined by actual return time
			})),
			pendingPayments: overduePayments.slice(0, 10).map((p) => ({
				paymentId: p.id,
				bookingNumber: p.bookingNumber,
				amount: p.amount,
				method: 'BankTransfer', // Default for pending
				daysPending: Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
			})),
		};
	}

	// ============ Report Methods ============

	/**
	 * Get revenue report
	 */
	async getRevenueReport(
		query: DateRangeQuery & { groupBy?: 'day' | 'week' | 'month'; vehicleType?: string }
	): Promise<RevenueReport> {
		const startDate = query.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		const endDate = query.endDate ?? new Date().toISOString().split('T')[0];
		const groupBy = query.groupBy ?? 'day';

		const [totalRevenue, bookingCounts, breakdown, byVehicleType, byPaymentMethod] = await Promise.all([
			this.repo.getTotalRevenue(startDate, endDate),
			this.repo.getBookingCountsByStatus(startDate, endDate),
			this.repo.getRevenueByDate(startDate, endDate, groupBy),
			this.repo.getRevenueByVehicleType(startDate, endDate),
			this.repo.getRevenueByPaymentMethod(startDate, endDate),
		]);

		return {
			reportInfo: this.getReportInfo('Revenue Report', startDate, endDate),
			summary: {
				totalRevenue,
				totalBookings: bookingCounts.total,
				averageBookingValue: bookingCounts.total > 0 ? Math.round(totalRevenue / bookingCounts.total) : 0,
				currency: 'IDR',
			},
			breakdown: breakdown.map((b) => ({
				period: b.date,
				revenue: b.revenue,
				bookings: b.bookings,
				averageValue: b.bookings > 0 ? Math.round(b.revenue / b.bookings) : 0,
			})),
			byVehicleType,
			byPaymentMethod,
		};
	}

	/**
	 * Get fleet utilization report
	 */
	async getFleetUtilizationReport(query: DateRangeQuery & { vehicleId?: string }): Promise<FleetUtilizationReport> {
		const startDate = query.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		const endDate = query.endDate ?? new Date().toISOString().split('T')[0];

		const [vehicleCounts, utilization, vehiclesByType] = await Promise.all([
			this.repo.getVehicleCountsByStatus(),
			this.repo.getFleetUtilization(startDate, endDate),
			this.repo.getVehiclesByType(),
		]);

		const daysInPeriod = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
		const totalAvailableDays = vehicleCounts.total * daysInPeriod;

		const maintenanceDaysByVehicle = await this.repo.getMaintenanceDaysByVehicle(startDate, endDate);

		const byVehicle = utilization.byVehicle.map((v) => ({
			...v,
			availableDays: daysInPeriod,
			utilizationRate: daysInPeriod > 0 ? Math.round((v.rentalDays / daysInPeriod) * 10000) / 100 : 0,
			maintenanceDays: maintenanceDaysByVehicle[v.vehicleId] ?? 0,
		}));

		const byType = vehiclesByType.map((t) => ({
			type: t.type,
			count: t.total,
			avgUtilizationRate: t.total > 0 ? Math.round((t.rented / t.total) * 100) : 0,
			totalRevenue: byVehicle.filter((v) => v.type === t.type).reduce((sum, v) => sum + v.revenue, 0),
		}));

		const underutilized = byVehicle.filter((v) => v.utilizationRate < 30);

		return {
			reportInfo: this.getReportInfo('Fleet Utilization Report', startDate, endDate),
			summary: {
				totalVehicles: vehicleCounts.total,
				totalRentalDays: utilization.totalRentalDays,
				totalAvailableDays,
				utilizationRate: totalAvailableDays > 0 ? Math.round((utilization.totalRentalDays / totalAvailableDays) * 10000) / 100 : 0,
				totalRevenue: byVehicle.reduce((sum, v) => sum + v.revenue, 0),
			},
			byVehicle: query.vehicleId ? byVehicle.filter((v) => v.vehicleId === query.vehicleId) : byVehicle,
			byType,
			underutilized: underutilized.map((v) => ({
				vehicleName: v.vehicleName,
				utilizationRate: v.utilizationRate,
				revenue: v.revenue,
			})),
		};
	}

	/**
	 * Get payment report
	 */
	async getPaymentReport(query: DateRangeQuery): Promise<PaymentReport> {
		const startDate = query.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		const endDate = query.endDate ?? new Date().toISOString().split('T')[0];

		const [paymentAmounts, byMethod, overduePayments, dailyBreakdown, methodCounts] = await Promise.all([
			this.repo.getPaymentAmountsByStatus(startDate, endDate),
			this.repo.getPaymentsByMethod(startDate, endDate),
			this.repo.getOverduePayments(),
			this.repo.getPaymentDailyBreakdown(startDate, endDate),
			this.repo.getRevenueByPaymentMethod(startDate, endDate),
		]);

		const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
		const overdueAmount = overduePayments
			.filter((p) => new Date(p.createdAt) < sevenDaysAgo)
			.reduce((sum, p) => sum + p.amount, 0);

		const totalExpected = paymentAmounts.totalReceived + paymentAmounts.totalPending;
		const collectionRate = totalExpected > 0 ? Math.round((paymentAmounts.totalReceived / totalExpected) * 10000) / 100 : 0;

		// Build a lookup for payment counts by method
		const methodCountMap = new Map(methodCounts.map(m => [m.method, m.count]));

		const byMethodExtended = Object.entries(byMethod).map(([method, total]) => {
			const count = methodCountMap.get(method as keyof typeof byMethod) ?? 0;
			return {
				method,
				total,
				count,
				avgAmount: count > 0 ? Math.round(total / count) : 0,
			};
		});

		return {
			reportInfo: this.getReportInfo('Payment Report', startDate, endDate),
			summary: {
				totalExpected,
				totalReceived: paymentAmounts.totalReceived,
				totalPending: paymentAmounts.totalPending,
				totalOverdue: overdueAmount,
				collectionRate,
			},
			byStatus: paymentAmounts.byStatus,
			byMethod: byMethodExtended,
			dailyBreakdown,
		};
	}

	/**
	 * Get customer report
	 */
	async getCustomerReport(query: DateRangeQuery): Promise<CustomerReport> {
		const startDate = query.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		const endDate = query.endDate ?? new Date().toISOString().split('T')[0];

		const [customerStats, topCustomers, byBookingCount] = await Promise.all([
			this.repo.getCustomerStats(startDate, endDate),
			this.repo.getTopCustomers(startDate, endDate, 10),
			this.repo.getCustomersByBookingCount(),
		]);

		return {
			reportInfo: this.getReportInfo('Customer Report', startDate, endDate),
			summary: {
				totalCustomers: customerStats.total,
				newCustomers: customerStats.newCount,
				repeatCustomers: byBookingCount.filter((b) => b.bookingCount !== '1').reduce((sum, b) => sum + b.customerCount, 0),
				blacklisted: customerStats.blacklisted,
			},
			topCustomers,
			byBookingCount,
		};
	}
}
