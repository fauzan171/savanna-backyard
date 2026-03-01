import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse, ApiPaginatedSuccessResponse } from '../types/api.types';

// Generic query hook for single item
export function useApiQuery<T>(
	key: string[],
	path: string,
	params?: Record<string, string>,
	options?: Omit<UseQueryOptions<ApiSuccessResponse<T>, Error, T>, 'queryKey' | 'queryFn'>
) {
	return useQuery<ApiSuccessResponse<T>, Error, T>({
		queryKey: [...key, params],
		queryFn: () => api.get<ApiSuccessResponse<T>>(path, params),
		select: (data) => data.data,
		...options,
	});
}

// Result type for paginated list
interface ListResult<T> {
	items: T[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

// Generic query hook for paginated list
export function useApiList<T>(
	key: string[],
	path: string,
	params?: Record<string, string>,
	options?: Omit<UseQueryOptions<ApiPaginatedSuccessResponse<T>, Error, ListResult<T>>, 'queryKey' | 'queryFn'>
) {
	return useQuery<ApiPaginatedSuccessResponse<T>, Error, ListResult<T>>({
		queryKey: [...key, params],
		queryFn: () => api.get<ApiPaginatedSuccessResponse<T>>(path, params),
		select: (data) => data.data,
		...options,
	});
}

// Generic mutation hook for create
export function useApiCreate<T, TInput = unknown>(
	key: string[],
	path: string,
	options?: Omit<UseMutationOptions<ApiSuccessResponse<T>, Error, TInput>, 'mutationFn'>
) {
	const queryClient = useQueryClient();

	return useMutation<ApiSuccessResponse<T>, Error, TInput>({
		mutationFn: (data: TInput) => api.post<ApiSuccessResponse<T>>(path, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: key });
		},
		...options,
	});
}

// Generic mutation hook for update
export function useApiUpdate<T, TInput = unknown>(
	key: string[],
	path: string,
	options?: Omit<UseMutationOptions<ApiSuccessResponse<T>, Error, { id: string; data: TInput }>, 'mutationFn'>
) {
	const queryClient = useQueryClient();

	return useMutation<ApiSuccessResponse<T>, Error, { id: string; data: TInput }>({
		mutationFn: ({ id, data }) => api.patch<ApiSuccessResponse<T>>(`${path}/${id}`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: key });
		},
		...options,
	});
}

// Generic mutation hook for delete
export function useApiDelete(
	key: string[],
	path: string,
	options?: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'>
) {
	const queryClient = useQueryClient();

	return useMutation<void, Error, string>({
		mutationFn: (id: string) => api.delete(`${path}/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: key });
		},
		...options,
	});
}

// Generic mutation hook for custom actions
export function useApiMutation<T, TInput = unknown>(
	key: string[],
	mutationFn: (input: TInput) => Promise<ApiSuccessResponse<T>>,
	options?: Omit<UseMutationOptions<ApiSuccessResponse<T>, Error, TInput>, 'mutationFn'>
) {
	const queryClient = useQueryClient();

	return useMutation<ApiSuccessResponse<T>, Error, TInput>({
		mutationFn,
		onSuccess: () => {
			if (key.length > 0) {
				queryClient.invalidateQueries({ queryKey: key });
			}
		},
		...options,
	});
}
