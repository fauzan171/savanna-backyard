import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';

export interface Review {
	id: string;
	name: string;
	location: string | null;
	rating: number;
	text: string;
	avatar: string | null;
	isPublished: boolean;
	createdAt: string;
	updatedAt: string;
}

export type CreateReviewRequest = Omit<Review, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateReviewRequest = Partial<CreateReviewRequest>;

const BASE_PATH = '/v1/reviews';

export const reviewsApi = {
	list: async () => api.get<ApiSuccessResponse<Review[]>>(BASE_PATH),
	getById: async (id: string) => api.get<ApiSuccessResponse<Review>>(`${BASE_PATH}/${id}`),
	create: async (data: CreateReviewRequest) => api.post<ApiSuccessResponse<Review>>(BASE_PATH, data),
	update: async (id: string, data: UpdateReviewRequest) => api.patch<ApiSuccessResponse<Review>>(`${BASE_PATH}/${id}`, data),
	delete: async (id: string) => api.delete<ApiSuccessResponse<void>>(`${BASE_PATH}/${id}`),
	toggle: async (id: string) => api.patch<ApiSuccessResponse<Review>>(`${BASE_PATH}/${id}/toggle`),
};
