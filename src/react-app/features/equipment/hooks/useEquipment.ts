import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';
import type { Equipment, EquipmentFilters, CreateEquipmentRequest, UpdateEquipmentRequest } from '../types/equipment.types';

const BASE_PATH = '/v1/equipment';

export const equipmentKeys = {
	all: ['equipment'],
	list: (filters?: EquipmentFilters) => ['equipment', 'list', filters],
	detail: (id: string) => ['equipment', 'detail', id],
};

export function useEquipmentList(params?: EquipmentFilters) {
	const searchParams: Record<string, string> = {};
	if (params?.category) searchParams.category = params.category;
	if (params?.activeOnly) searchParams.activeOnly = 'true';

	return useQuery({
		queryKey: equipmentKeys.list(params),
		queryFn: () => api.get<ApiSuccessResponse<Equipment[]>>(BASE_PATH, searchParams),
		select: (data) => data.data,
	});
}

export function useEquipment(id: string) {
	return useQuery({
		queryKey: equipmentKeys.detail(id),
		queryFn: () => api.get<ApiSuccessResponse<Equipment>>(`${BASE_PATH}/${id}`),
		select: (data) => data.data,
		enabled: !!id,
	});
}

export function useCreateEquipment() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateEquipmentRequest) =>
			api.post<ApiSuccessResponse<Equipment>>(BASE_PATH, data),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: equipmentKeys.all }),
	});
}

export function useUpdateEquipment() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateEquipmentRequest }) =>
			api.patch<ApiSuccessResponse<Equipment>>(`${BASE_PATH}/${id}`, data),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: equipmentKeys.all }),
	});
}

export function useDeleteEquipment() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			api.delete<ApiSuccessResponse<{ deletedId: string }>>(`${BASE_PATH}/${id}`),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: equipmentKeys.all }),
	});
}
