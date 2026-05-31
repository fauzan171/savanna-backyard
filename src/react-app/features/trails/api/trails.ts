import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';

export interface Trail {
	id: string;
	name: string;
	description: string | null;
	terrain: string | null;
	elevation: string | null;
	difficulty: string | null;
	recommended: string | null;
	image: string | null;
	mapImage: string | null;
	blogOverview: string | null;
	blogTips: string | null;
	blogGallery: string | null;
	gpxUrl: string | null;
	estimatedDuration: string | null;
	distance: string | null;
	bestTime: string | null;
	sortOrder: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export type CreateTrailRequest = Omit<Trail, 'createdAt' | 'updatedAt'>;
export type UpdateTrailRequest = Partial<CreateTrailRequest>;

const BASE_PATH = '/v1/trails';

export const trailsApi = {
	list: async () => api.get<ApiSuccessResponse<Trail[]>>(BASE_PATH),
	getById: async (id: string) => api.get<ApiSuccessResponse<Trail>>(`${BASE_PATH}/${id}`),
	create: async (data: CreateTrailRequest) => api.post<ApiSuccessResponse<Trail>>(BASE_PATH, data),
	update: async (id: string, data: UpdateTrailRequest) => api.patch<ApiSuccessResponse<Trail>>(`${BASE_PATH}/${id}`, data),
	delete: async (id: string) => api.delete<ApiSuccessResponse<void>>(`${BASE_PATH}/${id}`),
	toggle: async (id: string) => api.patch<ApiSuccessResponse<Trail>>(`${BASE_PATH}/${id}/toggle`),
};
