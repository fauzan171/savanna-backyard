/**
 * Statistics module types for dashboard and reports
 */

// ============ Query Types ============

export interface DateRangeQuery {
	startDate?: string;
	endDate?: string;
}

export interface ReportQuery extends DateRangeQuery {
	groupBy?: 'day' | 'week' | 'month';
	format?: 'json' | 'csv';
	vehicleType?: string;
	vehicleId?: string;
}

export interface PeriodFilter {
	period?: 'today' | 'week' | 'month' | 'year';
}

// ============ Dashboard Response Types ============

export interface DashboardOverview {
	period: string;
	revenue: {
		total: number;
		currency: string;
		bookingsCount: number;
		change: {
			value: number | null;
			direction: 'up' | 'down' | 'neutral';
		};
	};
	fleet: {
		total: number;
		available: number;
		rented: number;
		maintenance: number;
		utilizationRate: number;
	};
	payments: {
		verified: number;
		pending: number;
		overdue: number;
	};
	activeBookings: number;
	upcomingPickups: number;
	upcomingReturns: number;
}

export interface RevenueStats {
	period: {
		start: string;
		end: string;
	};
	summary: {
		totalRevenue: number;
		currency: string;
		bookingsCount: number;
		averagePerBooking: number;
	};
	breakdown: Array<{
		date: string;
		revenue: number;
		bookings: number;
	}>;
	byVehicleType: Array<{
		type: string;
		revenue: number;
		percentage: number;
	}>;
}

export interface FleetStats {
	period: {
		start: string;
		end: string;
	};
	summary: {
		totalVehicles: number;
		totalRentalDays: number;
		totalAvailableDays: number;
		utilizationRate: number;
		revenuePerVehicle: number;
	};
	byStatus: Record<string, number>;
	byType: Array<{
		type: string;
		total: number;
		rented: number;
		utilizationRate: number;
	}>;
	topVehicles: Array<{
		id: string;
		name: string;
		rentalDays: number;
		revenue: number;
		utilizationRate: number;
	}>;
	maintenanceAlerts: Array<{
		id: string;
		name: string;
		lastMaintenance: string | null;
		daysSinceMaintenance: number;
		status: string;
	}>;
}

export interface PaymentStats {
	period: {
		start: string;
		end: string;
	};
	summary: {
		totalExpected: number;
		totalReceived: number;
		totalPending: number;
		totalOverdue: number;
		collectionRate: number;
	};
	byStatus: Record<string, number>;
	byMethod: Record<string, number>;
	overduePayments: Array<{
		id: string;
		bookingNumber: string;
		customerName: string;
		amount: number;
		daysOverdue: number;
	}>;
}

export interface ActivitiesResult {
	todayPickups: Array<{
		bookingId: string;
		bookingNumber: string;
		customerName: string;
		customerPhone: string;
		vehicleName: string;
		time: string;
	}>;
	todayReturns: Array<{
		bookingId: string;
		bookingNumber: string;
		customerName: string;
		customerPhone: string;
		vehicleName: string;
		expectedTime: string;
		isLate: boolean;
	}>;
	pendingPayments: Array<{
		paymentId: string;
		bookingNumber: string;
		amount: number;
		method: string;
		daysPending: number;
	}>;
}

// ============ Report Types ============

export interface ReportInfo {
	title: string;
	period: {
		start: string;
		end: string;
	};
	generatedAt: string;
}

export interface RevenueReport {
	reportInfo: ReportInfo;
	summary: {
		totalRevenue: number;
		totalBookings: number;
		averageBookingValue: number;
		currency: string;
	};
	breakdown: Array<{
		period: string;
		revenue: number;
		bookings: number;
		averageValue: number;
	}>;
	byVehicleType: Array<{
		type: string;
		revenue: number;
		bookings: number;
		percentage: number;
	}>;
	byPaymentMethod: Array<{
		method: string;
		amount: number;
		count: number;
	}>;
}

export interface FleetUtilizationReport {
	reportInfo: ReportInfo;
	summary: {
		totalVehicles: number;
		totalRentalDays: number;
		totalAvailableDays: number;
		utilizationRate: number;
		totalRevenue: number;
	};
	byVehicle: Array<{
		vehicleId: string;
		vehicleName: string;
		plateNumber: string;
		type: string;
		rentalDays: number;
		availableDays: number;
		utilizationRate: number;
		revenue: number;
		maintenanceDays: number;
	}>;
	byType: Array<{
		type: string;
		count: number;
		avgUtilizationRate: number;
		totalRevenue: number;
	}>;
	underutilized: Array<{
		vehicleName: string;
		utilizationRate: number;
		revenue: number;
	}>;
}

export interface PaymentReport {
	reportInfo: ReportInfo;
	summary: {
		totalExpected: number;
		totalReceived: number;
		totalPending: number;
		totalOverdue: number;
		collectionRate: number;
	};
	byStatus: Record<string, number>;
	byMethod: Array<{
		method: string;
		total: number;
		count: number;
		avgAmount: number;
	}>;
	dailyBreakdown: Array<{
		date: string;
		received: number;
		pending: number;
	}>;
}

export interface CustomerReport {
	reportInfo: ReportInfo;
	summary: {
		totalCustomers: number;
		newCustomers: number;
		repeatCustomers: number;
		blacklisted: number;
	};
	topCustomers: Array<{
		customerId: string;
		name: string;
		totalBookings: number;
		totalSpent: number;
		lastBooking: string;
	}>;
	byBookingCount: Array<{
		bookingCount: string;
		customerCount: number;
	}>;
}
