// Reports module types

// ============================================
// DATE RANGE & QUERY PARAMS
// ============================================

export interface DateRangeParams {
	startDate?: string;
	endDate?: string;
}

export interface ReportQueryParams extends DateRangeParams {
	groupBy?: 'day' | 'week' | 'month';
}

// ============================================
// REVENUE REPORT
// ============================================

export interface RevenueReport {
	period: {
		startDate: string;
		endDate: string;
	};
	summary: {
		totalRevenue: number;
		totalBookings: number;
		averagePerBooking: number;
		currency: 'IDR' | 'USD';
	};
	byPeriod: Array<{
		period: string;
		revenue: number;
		bookings: number;
	}>;
	byVehicleType: Array<{
		type: string;
		revenue: number;
		bookings: number;
		percentage: number;
	}>;
	byPaymentMethod: Array<{
		method: string;
		count: number;
		amount: number;
		percentage: number;
	}>;
}

// ============================================
// FLEET UTILIZATION REPORT
// ============================================

export interface FleetUtilizationReport {
	period: {
		startDate: string;
		endDate: string;
	};
	summary: {
		totalVehicles: number;
		totalBookings: number;
		averageUtilization: number;
		totalDaysBooked: number;
	};
	byVehicle: Array<{
		id: string;
		name: string;
		plateNumber: string;
		type: string;
		bookingCount: number;
		daysBooked: number;
		utilizationRate: number;
		revenue: number;
	}>;
	byType: Array<{
		type: string;
		totalVehicles: number;
		bookingCount: number;
		averageUtilization: number;
	}>;
	trend: Array<{
		date: string;
		utilizationRate: number;
		bookings: number;
	}>;
}

// ============================================
// LEAD SOURCE REPORT
// ============================================

export interface LeadSourceReport {
	reportInfo?: {
		title: string;
		period: { start: string; end: string };
		generatedAt: string;
	};
	summary: {
		totalLeads: number;
		converted: number;
		lost?: number;
		inProgress?: number;
		// backend pakai overallConversionRate
		overallConversionRate?: number;
		// fallback jika backend berubah
		conversionRate?: number;
	};
	bySource: Array<{
		source: string;
		count: number;
		converted: number;
		conversionRate: number;
		percentage?: number;
	}>;
	// backend pakai byPriority, bukan byStatus
	byPriority?: Array<{
		priority: string;
		total: number;
		converted: number;
		conversionRate: number;
	}>;
	byStatus?: Array<{
		status: string;
		count: number;
		percentage: number;
	}>;
	trend: Array<{
		date: string;
		new: number;
		converted: number;
	}>;
}

// ============================================
// PAYMENT REPORT
// ============================================

export interface PaymentReport {
	reportInfo?: {
		title: string;
		period: { start: string; end: string };
		generatedAt: string;
	};
	summary: {
		totalExpected: number;
		totalReceived: number;
		totalPending: number;
		totalOverdue: number;
		collectionRate: number;
		// legacy fields (fallback)
		totalPayments?: number;
		totalAmount?: number;
		verified?: number;
		pending?: number;
		failed?: number;
	};
	// backend kirim object, bukan array
	byStatus: Record<string, number> | Array<{
		status: string;
		count: number;
		amount: number;
		percentage: number;
	}>;
	byMethod: Array<{
		method: string;
		total: number;
		count: number;
		avgAmount: number;
		// legacy
		amount?: number;
		percentage?: number;
	}>;
	// backend pakai dailyBreakdown, bukan trend
	dailyBreakdown?: Array<{
		date: string;
		count: number;
		amount: number;
	}>;
	trend?: Array<{
		date: string;
		count: number;
		amount: number;
	}>;
}

// ============================================
// CUSTOMER REPORT
// ============================================

export interface CustomerReport {
	reportInfo?: {
		title: string;
		period: { start: string; end: string };
		generatedAt: string;
	};
	summary: {
		totalCustomers: number;
		newCustomers: number;
		repeatCustomers: number;
		blacklisted?: number;
		// opsional karena backend tidak selalu kirim
		repeatRate?: number;
	};
	byBookingCount: Array<{
		bookingCount: string;
		customerCount: number;
		percentage?: number;
	}>;
	topCustomers: Array<{
		id: string;
		name: string;
		email: string;
		phone: string;
		bookingCount: number;
		totalSpent: number;
	}>;
	trend?: Array<{
		date: string;
		new: number;
		repeat: number;
	}>;
}