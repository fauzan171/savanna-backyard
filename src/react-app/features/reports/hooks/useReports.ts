import { useQuery } from '@tanstack/react-query';
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

// Query keys for cache management
export const reportsKeys = {
	all: ['reports'] as const,
	revenue: (params?: ReportQueryParams) => [...reportsKeys.all, 'revenue', params] as string[],
	fleetUtilization: (params?: ReportQueryParams) => [...reportsKeys.all, 'fleet', params] as string[],
	leadSources: (params?: DateRangeParams) => [...reportsKeys.all, 'leads', params] as string[],
	payments: (params?: DateRangeParams) => [...reportsKeys.all, 'payments', params] as string[],
	customers: (params?: DateRangeParams) => [...reportsKeys.all, 'customers', params] as string[],
};

/**
 * Hook for revenue report
 */
export function useRevenueReport(params?: ReportQueryParams) {
	return useQuery({
		queryKey: reportsKeys.revenue(params),
		queryFn: () =>
			api.get<ApiSuccessResponse<RevenueReport>>(
				'/v1/reports/revenue',
				params as Record<string, string>
			),
		select: (data) => {
			const report = data.data;
			if (!report) return report;
			return {
				...report,
				byPeriod: report.byPeriod ?? [],
				byVehicleType: report.byVehicleType ?? [],
				byPaymentMethod: report.byPaymentMethod ?? [],
			};
		},
	});
}

/**
 * Hook for fleet utilization report
 */
export function useFleetUtilizationReport(params?: ReportQueryParams) {
	return useQuery({
		queryKey: reportsKeys.fleetUtilization(params),
		queryFn: () =>
			api.get<ApiSuccessResponse<FleetUtilizationReport>>(
				'/v1/reports/fleet-utilization',
				params as Record<string, string>
			),
		select: (data) => {
			const report = data.data;
			if (!report) return report;
			return {
				...report,
				byVehicle: report.byVehicle ?? [],
				byType: report.byType ?? [],
				trend: report.trend ?? [],
			};
		},
	});
}

/**
 * Hook for lead source report
 */
export function useLeadSourceReport(params?: DateRangeParams) {
	return useQuery({
		queryKey: reportsKeys.leadSources(params),
		queryFn: () =>
			api.get<ApiSuccessResponse<LeadSourceReport>>(
				'/v1/reports/lead-sources',
				params as Record<string, string>
			),
		select: (data) => {
			const report = data.data;
			if (!report) return report;
			return {
				...report,
				bySource: report.bySource ?? [],
				byStatus: report.byStatus ?? [],
				trend: report.trend ?? [],
			};
		},
	});
}

/**
 * Hook for payment report
 */
export function usePaymentReport(params?: DateRangeParams) {
	return useQuery({
		queryKey: reportsKeys.payments(params),
		queryFn: () =>
			api.get<ApiSuccessResponse<PaymentReport>>(
				'/v1/reports/payments',
				params as Record<string, string>
			),
		select: (data) => {
			const report = data.data;
			if (!report) return report;
			return {
				...report,
				byStatus: report.byStatus ?? [],
				byMethod: report.byMethod ?? [],
				trend: report.trend ?? [],
			};
		},
	});
}

/**
 * Hook for customer report
 */
export function useCustomerReport(params?: DateRangeParams) {
	return useQuery({
		queryKey: reportsKeys.customers(params),
		queryFn: () =>
			api.get<ApiSuccessResponse<CustomerReport>>(
				'/v1/reports/customers',
				params as Record<string, string>
			),
		select: (data) => {
			const report = data.data;
			if (!report) return report;
			return {
				...report,
				byBookingCount: report.byBookingCount ?? [],
				topCustomers: report.topCustomers ?? [],
				trend: report.trend ?? [],
			};
		},
	});
}