import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse, ApiPaginatedSuccessResponse } from '@/react-app/features/shared/types/api.types';
import { maintenanceApi } from '../api/maintenanceApi';
import type {
	ListMaintenanceQuery,
	CreateMaintenanceRequest,
	UpdateMaintenanceRequest,
	CompleteMaintenanceRequest,
	UpcomingQuery,
	VehicleHistoryQuery,
	Maintenance,
	MaintenanceWithDetails,
	UpcomingMaintenanceItem,
	VehicleMaintenanceSummary,
	CreateMaintenanceResult,
} from '../types/maintenance.types';

// Query keys for cache management
export const maintenanceKeys = {
	all: ['maintenance'] as const,
	list: (params?: ListMaintenanceQuery) => [...maintenanceKeys.all, 'list', params] as string[],
	detail: (id: string) => [...maintenanceKeys.all, 'detail', id] as string[],
	upcoming: (params?: UpcomingQuery) => [...maintenanceKeys.all, 'upcoming', params] as string[],
	vehicleHistory: (vehicleId: string, params?: VehicleHistoryQuery) =>
		[...maintenanceKeys.all, 'vehicle', vehicleId, params] as string[],
};

interface ListResult<T> {
	items: T[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

/**
 * Hook for listing maintenance records
 */
export function useMaintenanceList(params?: ListMaintenanceQuery) {
	return useQuery({
		queryKey: maintenanceKeys.list(params),
		queryFn: () =>
			api.get<ApiPaginatedSuccessResponse<Maintenance>>(
				'/v1/maintenance',
				params
					? {
							...(params.page && { page: String(params.page) }),
							...(params.limit && { limit: String(params.limit) }),
							...(params.status && { status: params.status }),
							...(params.type && { type: params.type }),
							...(params.vehicleId && { vehicleId: params.vehicleId }),
						}
					: undefined
			),
		select: (data): ListResult<Maintenance> => data.data,
	});
}

/**
 * Hook for fetching a single maintenance record
 */
export function useMaintenance(id: string) {
	return useQuery({
		queryKey: maintenanceKeys.detail(id),
		queryFn: () => api.get<ApiSuccessResponse<MaintenanceWithDetails>>(`/v1/maintenance/${id}`),
		select: (data) => data.data,
		enabled: !!id,
	});
}

/**
 * Hook for creating a maintenance record
 */
export function useCreateMaintenance() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateMaintenanceRequest) =>
			api.post<ApiSuccessResponse<CreateMaintenanceResult>>('/v1/maintenance', data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
		},
	});
}

/**
 * Hook for updating a maintenance record
 */
export function useUpdateMaintenance() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateMaintenanceRequest }) =>
			api.patch<ApiSuccessResponse<Maintenance>>(`/v1/maintenance/${id}`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
		},
	});
}

/**
 * Hook for starting a maintenance
 */
export function useStartMaintenance() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => maintenanceApi.start(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
		},
	});
}

/**
 * Hook for completing a maintenance
 */
export function useCompleteMaintenance() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...data }: { id: string } & CompleteMaintenanceRequest) =>
			maintenanceApi.complete(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
		},
	});
}

/**
 * Hook for fetching upcoming maintenance
 */
export function useUpcomingMaintenance(params?: UpcomingQuery) {
	return useQuery({
		queryKey: maintenanceKeys.upcoming(params),
		queryFn: () =>
			api.get<ApiSuccessResponse<UpcomingMaintenanceItem[]>>(
				'/v1/maintenance/upcoming',
				params ? { days: String(params.days) } : undefined
			),
		select: (data) => data.data,
	});
}

/**
 * Hook for fetching vehicle maintenance history
 */
export function useVehicleMaintenanceHistory(vehicleId: string, params?: VehicleHistoryQuery) {
	return useQuery({
		queryKey: maintenanceKeys.vehicleHistory(vehicleId, params),
		queryFn: () =>
			api.get<ApiSuccessResponse<VehicleMaintenanceSummary>>(
				`/v1/maintenance/vehicles/${vehicleId}/history`,
				params
					? {
							...(params.page && { page: String(params.page) }),
							...(params.limit && { limit: String(params.limit) }),
							...(params.type && { type: params.type }),
						}
					: undefined
			),
		select: (data) => data.data,
		enabled: !!vehicleId,
	});
}
