// Dashboard Types - synced with backend statistics module

// ============================================
// PERIOD TYPES
// ============================================

export type PeriodFilter = 'today' | 'week' | 'month' | 'year';

// ============================================
// DASHBOARD OVERVIEW
// ============================================

export interface DashboardOverview {
	period: string;
	leads: {
		total: number;
		new: number;
		converted: number;
		conversionRate: number;
	};
	bookings: {
		total: number;
		active: number;
		completed: number;
		cancelled: number;
	};
	vehicles: {
		total: number;
		available: number;
		inUse: number;
		inMaintenance: number;
	};
	customers: {
		total: number;
		new: number;
		repeat: number;
		blacklisted: number;
	};
	revenue: {
		total: number;
		collected: number;
		pending: number;
		currency: 'IDR' | 'USD';
	};
}

// ============================================
// REVENUE STATS
// ============================================

export interface RevenueStats {
	period: string;
	summary: {
		total: number;
		collected: number;
		pending: number;
		overdue: number;
		currency: 'IDR' | 'USD';
	};
	byMethod: Array<{
		method: string;
		count: number;
		amount: number;
		percentage: number;
	}>;
	trend: Array<{
		date: string;
		amount: number;
		cumulative: number;
	}>;
}

// ============================================
// LEAD STATS
// ============================================

export interface LeadStats {
	period: string;
	summary: {
		total: number;
		new: number;
		contacted: number;
		qualified: number;
		converted: number;
		lost: number;
		conversionRate: number;
	};
	bySource: Array<{
		source: string;
		count: number;
		converted: number;
		conversionRate: number;
	}>;
	byStatus: Array<{
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
// FLEET STATS
// ============================================

export interface FleetStats {
	period: string;
	summary: {
		total: number;
		available: number;
		inUse: number;
		inMaintenance: number;
		utilizationRate: number;
	};
	byType: Array<{
		type: string;
		total: number;
		available: number;
		inUse: number;
		utilizationRate: number;
	}>;
	byStatus: Array<{
		status: string;
		count: number;
		percentage: number;
	}>;
	topVehicles: Array<{
		id: string;
		name: string;
		plateNumber: string;
		bookingCount: number;
		revenue: number;
		utilizationRate: number;
	}>;
}

// ============================================
// PAYMENT STATS
// ============================================

export interface PaymentStats {
	period: string;
	summary: {
		totalPayments: number;
		totalAmount: number;
		verified: number;
		pending: number;
		failed: number;
		currency: 'IDR' | 'USD';
	};
	byStatus: Array<{
		status: string;
		count: number;
		amount: number;
		percentage: number;
	}>;
	byMethod: Array<{
		method: string;
		count: number;
		amount: number;
		percentage: number;
	}>;
	trend: Array<{
		date: string;
		count: number;
		amount: number;
	}>;
}

// ============================================
// ACTIVITY FEED
// ============================================

export interface Activity {
	id: string;
	type: 'booking_created' | 'booking_started' | 'booking_completed' | 'booking_cancelled' | 'payment_received' | 'lead_converted' | 'maintenance_started' | 'maintenance_completed';
	title: string;
	description: string;
	entityType: 'booking' | 'payment' | 'lead' | 'maintenance' | 'vehicle' | 'customer';
	entityId: string;
	entityReference: string;
	performedBy: {
		id: string;
		name: string;
	};
	createdAt: string;
}

export interface ActivitiesResult {
	activities: Activity[];
	total: number;
}

// ============================================
// API QUERY PARAMS
// ============================================

export interface DashboardQueryParams {
	period?: PeriodFilter;
	startDate?: string;
	endDate?: string;
}
