import { useQuery } from '@tanstack/react-query';
import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';
import type {
	DashboardOverview,
	RevenueStats,
	FleetStats,
	PaymentStats,
	ActivitiesResult,
	DashboardQueryParams,
} from '../types/dashboard.types';

// Query keys for cache management
export const dashboardKeys = {
	all: ['dashboard'] as const,
	overview: (params?: DashboardQueryParams) => [...dashboardKeys.all, 'overview', params] as string[],
	revenue: (params?: DashboardQueryParams) => [...dashboardKeys.all, 'revenue', params] as string[],
	fleet: (params?: DashboardQueryParams) => [...dashboardKeys.all, 'fleet', params] as string[],
	payments: (params?: DashboardQueryParams) => [...dashboardKeys.all, 'payments', params] as string[],
	activities: (limit?: number) => [...dashboardKeys.all, 'activities', limit] as string[],
};

/**
 * Hook for dashboard overview statistics
 */
export function useDashboardOverview(params?: DashboardQueryParams) {
	return useQuery({
		queryKey: dashboardKeys.overview(params),
		queryFn: () => api.get<ApiSuccessResponse<DashboardOverview>>('/v1/dashboard/overview', params as Record<string, string>),
		select: (data) => data.data,
	});
}

/**
 * Hook for revenue statistics
 */
export function useDashboardRevenue(params?: DashboardQueryParams) {
	return useQuery({
		queryKey: dashboardKeys.revenue(params),
		queryFn: () => api.get<ApiSuccessResponse<RevenueStats>>('/v1/dashboard/revenue', params as Record<string, string>),
		select: (data) => data.data,
	});
}

/**
 * Hook for fleet statistics
 */
export function useDashboardFleet(params?: DashboardQueryParams) {
	return useQuery({
		queryKey: dashboardKeys.fleet(params),
		queryFn: () => api.get<ApiSuccessResponse<FleetStats>>('/v1/dashboard/fleet', params as Record<string, string>),
		select: (data) => data.data,
	});
}

/**
 * Hook for payment statistics
 */
export function useDashboardPayments(params?: DashboardQueryParams) {
	return useQuery({
		queryKey: dashboardKeys.payments(params),
		queryFn: () => api.get<ApiSuccessResponse<PaymentStats>>('/v1/dashboard/payments', params as Record<string, string>),
		select: (data) => data.data,
	});
}

/**
 * Hook for recent activities
 */
export function useDashboardActivities(limit?: number) {
	return useQuery({
		queryKey: dashboardKeys.activities(limit),
		queryFn: () => api.get<ApiSuccessResponse<ActivitiesResult>>('/v1/dashboard/activities', limit ? { limit: String(limit) } : undefined),
		select: (data) => data.data,
	});
}
