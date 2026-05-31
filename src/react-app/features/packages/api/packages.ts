import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';

export interface Package {
	id: string;
	name: string;
	tagline: string | null;
	description: string | null;
	image: string | null;
	duration: string | null;
	distance: string | null;
	groupSize: string | null;
	price: number;
	trailId: string | null;
	sortOrder: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export type CreatePackageRequest = Omit<Package, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdatePackageRequest = Partial<CreatePackageRequest>;

const BASE_PATH = '/v1/packages';

export const packagesApi = {
	list: async () => api.get<ApiSuccessResponse<Package[]>>(BASE_PATH),
	getById: async (id: string) => api.get<ApiSuccessResponse<Package>>(`${BASE_PATH}/${id}`),
	create: async (data: CreatePackageRequest) => api.post<ApiSuccessResponse<Package>>(BASE_PATH, data),
	update: async (id: string, data: UpdatePackageRequest) => api.patch<ApiSuccessResponse<Package>>(`${BASE_PATH}/${id}`, data),
	delete: async (id: string) => api.delete<ApiSuccessResponse<void>>(`${BASE_PATH}/${id}`),
	toggle: async (id: string) => api.patch<ApiSuccessResponse<Package>>(`${BASE_PATH}/${id}/toggle`),
};
