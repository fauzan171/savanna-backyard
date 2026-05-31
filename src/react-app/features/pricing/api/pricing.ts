import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';

export interface PricingTier {
	id: string;
	name: string;
	description: string | null;
	dailyPrice: number;
	multiDayPrice: number;
	features: string;
	notIncluded: string;
	highlighted: boolean;
	icon: string | null;
	sortOrder: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export type CreatePricingRequest = {
	name: string;
	description?: string | null;
	dailyPrice: number;
	multiDayPrice: number;
	features: string[];
	notIncluded: string[];
	highlighted?: boolean;
	icon?: string | null;
	sortOrder?: number;
	isActive?: boolean;
};

export type UpdatePricingRequest = Partial<CreatePricingRequest>;

const BASE_PATH = '/v1/pricing';

export const pricingApi = {
	list: async () => api.get<ApiSuccessResponse<PricingTier[]>>(BASE_PATH),
	getById: async (id: string) => api.get<ApiSuccessResponse<PricingTier>>(`${BASE_PATH}/${id}`),
	create: async (data: CreatePricingRequest) => api.post<ApiSuccessResponse<PricingTier>>(BASE_PATH, data),
	update: async (id: string, data: UpdatePricingRequest) => api.patch<ApiSuccessResponse<PricingTier>>(`${BASE_PATH}/${id}`, data),
	delete: async (id: string) => api.delete<ApiSuccessResponse<void>>(`${BASE_PATH}/${id}`),
	toggle: async (id: string) => api.patch<ApiSuccessResponse<PricingTier>>(`${BASE_PATH}/${id}/toggle`),
};
