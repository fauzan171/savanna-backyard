// Dashboard Types - synced with backend statistics module

// ============================================
// PERIOD TYPES
// ============================================

export type PeriodFilter = 'today' | 'week' | 'month' | 'year';

/**
 * The backend returns `period` in two inconsistent shapes depending on the
 * endpoint: some return a plain string (e.g. 'today'), others return an
 * object { start, end }. This union accepts both and the rendering layer
 * normalizes via formatPeriodLabel(). DASH-01 fix.
 */
export type Period = string | { start: string; end: string } | { label?: string; value?: string };

// ============================================
// DASHBOARD OVERVIEW
// ============================================

export interface DashboardOverview {
	period: Period;
	revenue: {
		total: number;
		currency: string;
		bookingsCount: number;
		change: {
			value: number | null;
			direction: 'up' | 'down' | 'neutral';
		};
	};
	leads: {
		new: number;
		converted: number;
		conversionRate: number;
		followUpsDue: number;
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

// ============================================
// REVENUE STATS
// ============================================

export interface RevenueStats {
	period: Period;
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
	period: Period;
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
	period: Period;
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
	period: Period;
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