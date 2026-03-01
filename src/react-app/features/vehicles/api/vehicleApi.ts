import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse, ApiPaginatedSuccessResponse } from '@/react-app/features/shared/types/api.types';
import type {
	Vehicle,
	VehicleWithDetails,
	CreateVehicleRequest,
	UpdateVehicleRequest,
	UpdateStatusRequest,
	VehicleFilters,
	AvailabilityParams,
	AvailabilityResult,
	CalendarDay,
} from '../types/vehicle.types';

const BASE_PATH = '/v1/vehicles';

export const vehicleApi = {
	// List vehicles with pagination
	list: async (params?: VehicleFilters & { page?: number; limit?: number }) => {
		const searchParams: Record<string, string> = {};
		if (params?.page) searchParams.page = String(params.page);
		if (params?.limit) searchParams.limit = String(params.limit);
		if (params?.search) searchParams.search = params.search;
		if (params?.status) searchParams.status = params.status;
		if (params?.type) searchParams.type = params.type;

		return api.get<ApiPaginatedSuccessResponse<Vehicle>>(BASE_PATH, searchParams);
	},

	// Get single vehicle by ID
	getById: async (id: string) => {
		return api.get<ApiSuccessResponse<VehicleWithDetails>>(`${BASE_PATH}/${id}`);
	},

	// Create new vehicle
	create: async (data: CreateVehicleRequest) => {
		return api.post<ApiSuccessResponse<Vehicle>>(BASE_PATH, data);
	},

	// Update vehicle
	update: async (id: string, data: UpdateVehicleRequest) => {
		return api.patch<ApiSuccessResponse<Vehicle>>(`${BASE_PATH}/${id}`, data);
	},

	// Update vehicle status
	updateStatus: async (id: string, data: UpdateStatusRequest) => {
		return api.patch<ApiSuccessResponse<Vehicle>>(`${BASE_PATH}/${id}/status`, data);
	},

	// Check availability
	checkAvailability: async (params: AvailabilityParams) => {
		const searchParams: Record<string, string> = {
			startDate: params.startDate,
			endDate: params.endDate,
		};
		if (params.type) searchParams.type = params.type;
		if (params.vehicleId) searchParams.vehicleId = params.vehicleId;

		return api.get<ApiSuccessResponse<AvailabilityResult>>(`${BASE_PATH}/availability`, searchParams);
	},

	// Get availability calendar
	getCalendar: async (vehicleId: string, month: string) => {
		return api.get<ApiSuccessResponse<{ vehicleId: string; month: string; calendar: CalendarDay[] }>>(
			`${BASE_PATH}/${vehicleId}/calendar`,
			{ month }
		);
	},
};
