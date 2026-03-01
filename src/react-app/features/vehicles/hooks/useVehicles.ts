import { useApiQuery, useApiList, useApiCreate, useApiUpdate, useApiMutation } from '@/react-app/features/shared/hooks/useApi';
import { vehicleApi } from '../api/vehicleApi';
import type {
	Vehicle,
	VehicleWithDetails,
	CreateVehicleRequest,
	UpdateVehicleRequest,
	UpdateStatusRequest,
	VehicleFilters,
	AvailabilityParams,
	AvailabilityResult,
} from '../types/vehicle.types';

// Query keys for cache management
export const vehicleKeys = {
	all: ['vehicles'] as string[],
	list: (filters?: VehicleFilters) => ['vehicles', 'list', filters] as string[],
	detail: (id: string) => ['vehicles', 'detail', id] as string[],
	availability: (params: AvailabilityParams) => ['vehicles', 'availability', params] as string[],
	calendar: (vehicleId: string, month: string) => ['vehicles', 'calendar', vehicleId, month] as string[],
};

// Hook for listing vehicles
export function useVehicles(params?: VehicleFilters & { page?: number; limit?: number }) {
	return useApiList<Vehicle>(
		vehicleKeys.list(params),
		'/v1/vehicles',
		params ? {
			...(params.page && { page: String(params.page) }),
			...(params.limit && { limit: String(params.limit) }),
			...(params.search && { search: params.search }),
			...(params.status && { status: params.status }),
			...(params.type && { type: params.type }),
		} : undefined
	);
}

// Hook for single vehicle detail
export function useVehicle(id: string) {
	return useApiQuery<VehicleWithDetails>(
		vehicleKeys.detail(id),
		`/v1/vehicles/${id}`
	);
}

// Hook for creating vehicle
export function useCreateVehicle() {
	return useApiCreate<Vehicle, CreateVehicleRequest>(
		vehicleKeys.all,
		'/v1/vehicles'
	);
}

// Hook for updating vehicle
export function useUpdateVehicle() {
	return useApiUpdate<Vehicle, UpdateVehicleRequest>(
		vehicleKeys.all,
		'/v1/vehicles'
	);
}

// Hook for updating vehicle status
export function useUpdateVehicleStatus() {
	return useApiMutation<Vehicle, { id: string } & UpdateStatusRequest>(
		vehicleKeys.all,
		async ({ id, ...data }) => vehicleApi.updateStatus(id, data)
	);
}

// Hook for checking availability
export function useVehicleAvailability(params: AvailabilityParams | null) {
	return useApiQuery<AvailabilityResult>(
		params ? vehicleKeys.availability(params) : ['vehicles', 'availability', null] as string[],
		'/v1/vehicles/availability',
		params ? {
			startDate: params.startDate,
			endDate: params.endDate,
			...(params.type && { type: params.type }),
			...(params.vehicleId && { vehicleId: params.vehicleId }),
		} : undefined,
		{ enabled: !!params }
	);
}

// Hook for availability calendar
export function useVehicleCalendar(vehicleId: string, month: string) {
	return useApiQuery<{ vehicleId: string; month: string; calendar: Array<{ date: string; status: string; bookingId?: string }> }>(
		vehicleKeys.calendar(vehicleId, month),
		`/v1/vehicles/${vehicleId}/calendar`,
		{ month }
	);
}
