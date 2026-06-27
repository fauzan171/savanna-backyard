import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse, ApiPaginatedSuccessResponse } from '@/react-app/features/shared/types/api.types';
import type { Equipment, EquipmentFilters, CreateEquipmentRequest, UpdateEquipmentRequest } from '../types/equipment.types';

const BASE_PATH = '/v1/equipment';

export const equipmentApi = {
	list: async (params?: EquipmentFilters) => {
		const searchParams: Record<string, string> = {};
		if (params?.category) searchParams.category = params.category;
		if (params?.activeOnly) searchParams.activeOnly = 'true';
		return api.get<ApiSuccessResponse<Equipment[]>>(BASE_PATH, searchParams);
	},

	getById: async (id: string) => {
		return api.get<ApiSuccessResponse<Equipment>>(`${BASE_PATH}/${id}`);
	},

	create: async (data: CreateEquipmentRequest) => {
		return api.post<ApiSuccessResponse<Equipment>>(BASE_PATH, data);
	},

	update: async (id: string, data: UpdateEquipmentRequest) => {
		return api.patch<ApiSuccessResponse<Equipment>>(`${BASE_PATH}/${id}`, data);
	},

	delete: async (id: string) => {
		return api.delete<ApiSuccessResponse<{ deletedId: string }>>(`${BASE_PATH}/${id}`);
	},
};
