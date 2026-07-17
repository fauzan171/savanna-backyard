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

const BASE_PATH = '/v1/dashboard';

export const dashboardApi = {
	/**
	 * Get dashboard overview statistics
	 */
	getOverview: (params?: DashboardQueryParams) =>
		api.get<ApiSuccessResponse<DashboardOverview>>(`${BASE_PATH}/overview`, params as Record<string, string>),

	/**
	 * Get revenue statistics
	 */
	getRevenue: (params?: DashboardQueryParams) =>
		api.get<ApiSuccessResponse<RevenueStats>>(`${BASE_PATH}/revenue`, params as Record<string, string>),

	/**
	 * Get fleet statistics
	 */
	getFleet: (params?: DashboardQueryParams) =>
		api.get<ApiSuccessResponse<FleetStats>>(`${BASE_PATH}/fleet`, params as Record<string, string>),

	/**
	 * Get payment statistics
	 */
	getPayments: (params?: DashboardQueryParams) =>
		api.get<ApiSuccessResponse<PaymentStats>>(`${BASE_PATH}/payments`, params as Record<string, string>),

	/**
	 * Get recent activities
	 */
	getActivities: (limit?: number) =>
		api.get<ApiSuccessResponse<ActivitiesResult>>(`${BASE_PATH}/activities`, limit ? { limit: String(limit) } : undefined),
};
