import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';
import type {
	ReportQueryParams,
	DateRangeParams,
	RevenueReport,
	FleetUtilizationReport,
	LeadSourceReport,
	PaymentReport,
	CustomerReport,
} from '../types/reports.types';

const BASE_PATH = '/v1/reports';

export const reportsApi = {
	/**
	 * Get revenue report
	 */
	getRevenue: (params?: ReportQueryParams) =>
		api.get<ApiSuccessResponse<RevenueReport>>(`${BASE_PATH}/revenue`, params as Record<string, string>),

	/**
	 * Get fleet utilization report
	 */
	getFleetUtilization: (params?: ReportQueryParams) =>
		api.get<ApiSuccessResponse<FleetUtilizationReport>>(
			`${BASE_PATH}/fleet-utilization`,
			params as Record<string, string>
		),

	/**
	 * Get lead source report
	 */
	getLeadSources: (params?: DateRangeParams) =>
		api.get<ApiSuccessResponse<LeadSourceReport>>(
			`${BASE_PATH}/lead-sources`,
			params as Record<string, string>
		),

	/**
	 * Get payment report
	 */
	getPayments: (params?: DateRangeParams) =>
		api.get<ApiSuccessResponse<PaymentReport>>(`${BASE_PATH}/payments`, params as Record<string, string>),

	/**
	 * Get customer report
	 */
	getCustomers: (params?: DateRangeParams) =>
		api.get<ApiSuccessResponse<CustomerReport>>(`${BASE_PATH}/customers`, params as Record<string, string>),

	/**
	 * Export report as CSV
	 */
	getExportUrl: (reportType: string, params?: DateRangeParams) => {
		const url = new URL(`${BASE_PATH}/${reportType}/export`, window.location.origin);
		if (params?.startDate) url.searchParams.set('startDate', params.startDate);
		if (params?.endDate) url.searchParams.set('endDate', params.endDate);
		url.searchParams.set('format', 'csv');
		return url.toString();
	},
};
