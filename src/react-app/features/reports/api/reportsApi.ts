import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';
import type {
	ReportQueryParams,
	DateRangeParams,
	RevenueReport,
	FleetUtilizationReport,
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
	 * Build the export URL for a report CSV download.
	 *
	 * RPT-03 fix: the API client base path is '/api' (see lib/api-client.ts),
	 * but the previous implementation used `new URL('/v1/reports/...')` which
	 * omitted the '/api' prefix — causing every export to 404 silently. We now
	 * prefix '/api' so the URL matches the actual route (/api/v1/reports/...).
	 */
	getExportUrl: (reportType: string, params?: DateRangeParams) => {
		const url = new URL(`/api${BASE_PATH}/${reportType}/export`, window.location.origin);
		if (params?.startDate) url.searchParams.set('startDate', params.startDate);
		if (params?.endDate) url.searchParams.set('endDate', params.endDate);
		url.searchParams.set('format', 'csv');
		return url.toString();
	},

	/**
	 * Export report as CSV via an authenticated fetch + Blob download.
	 *
	 * Returns the downloaded Blob (so the caller can react when the backend
	 * produces an empty file, e.g. show a 'no data' toast). Throws on non-OK
	 * responses so the caller can surface the error.
	 */
	exportCsv: async (reportType: string, params?: DateRangeParams): Promise<Blob> => {
		const url = reportsApi.getExportUrl(reportType, params);
		const response = await fetch(url, {
			method: 'GET',
			credentials: 'include',
			headers: { Accept: 'text/csv' },
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({ error: { message: 'Export failed' } }));
			throw new Error(errorBody.error?.message || `Export failed (${response.status})`);
		}

		return response.blob();
	},
};
