import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse, ApiPaginatedSuccessResponse } from '@/react-app/features/shared/types/api.types';
import type {
	Maintenance,
	MaintenanceWithDetails,
	CreateMaintenanceRequest,
	UpdateMaintenanceRequest,
	CompleteMaintenanceRequest,
	ListMaintenanceQuery,
	VehicleHistoryQuery,
	UpcomingQuery,
	CreateMaintenanceResult,
	CompleteMaintenanceResult,
	UpcomingMaintenanceItem,
	VehicleMaintenanceSummary,
} from '../types/maintenance.types';

const BASE_PATH = '/v1/maintenance';

export const maintenanceApi = {
	/**
	 * List maintenance records with pagination and filters
	 */
	list: (params?: ListMaintenanceQuery) =>
		api.get<ApiPaginatedSuccessResponse<Maintenance>>(BASE_PATH, params as Record<string, string>),

	/**
	 * Get a single maintenance record by ID
	 */
	getById: (id: string) =>
		api.get<ApiSuccessResponse<MaintenanceWithDetails>>(`${BASE_PATH}/${id}`),

	/**
	 * Create a new maintenance record
	 */
	create: (data: CreateMaintenanceRequest) =>
		api.post<ApiSuccessResponse<CreateMaintenanceResult>>(BASE_PATH, data),

	/**
	 * Update a maintenance record
	 */
	update: (id: string, data: UpdateMaintenanceRequest) =>
		api.patch<ApiSuccessResponse<Maintenance>>(`${BASE_PATH}/${id}`, data),

	/**
	 * Start a scheduled maintenance
	 */
	start: (id: string) =>
		api.post<ApiSuccessResponse<Maintenance>>(`${BASE_PATH}/${id}/start`, {}),

	/**
	 * Complete an in-progress maintenance
	 */
	complete: (id: string, data: CompleteMaintenanceRequest) =>
		api.post<ApiSuccessResponse<CompleteMaintenanceResult>>(`${BASE_PATH}/${id}/complete`, data),

	/**
	 * Get upcoming maintenance records
	 */
	getUpcoming: (params?: UpcomingQuery) =>
		api.get<ApiSuccessResponse<UpcomingMaintenanceItem[]>>(`${BASE_PATH}/upcoming`, params as Record<string, string>),

	/**
	 * Get maintenance history for a specific vehicle
	 */
	getVehicleHistory: (vehicleId: string, params?: VehicleHistoryQuery) =>
		api.get<ApiSuccessResponse<VehicleMaintenanceSummary>>(
			`${BASE_PATH}/vehicles/${vehicleId}/history`,
			params as Record<string, string>
		),
};
