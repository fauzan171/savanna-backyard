import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';

export interface User {
	id: string;
	name: string;
	email: string;
	role: 'SUPER_ADMIN' | 'STAFF';
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export type CreateUserRequest = { name: string; email: string; password: string; role?: string; isActive?: boolean };
export type UpdateUserRequest = { name?: string; email?: string; role?: string; isActive?: boolean };

const BASE_PATH = '/v1/users';

export const usersApi = {
	list: async () => api.get<ApiSuccessResponse<User[]>>(BASE_PATH),
	create: async (data: CreateUserRequest) => api.post<ApiSuccessResponse<User>>(BASE_PATH, data),
	update: async (id: string, data: UpdateUserRequest) => api.patch<ApiSuccessResponse<User>>(`${BASE_PATH}/${id}`, data),
	toggle: async (id: string) => api.patch<ApiSuccessResponse<User>>(`${BASE_PATH}/${id}/toggle`),
	changePassword: async (id: string, data: { currentPassword: string; newPassword: string }) =>
		api.patch<ApiSuccessResponse<{ success: boolean }>>(`${BASE_PATH}/${id}/password`, data),
};
