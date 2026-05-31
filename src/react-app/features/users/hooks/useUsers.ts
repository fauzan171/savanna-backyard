import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, type CreateUserRequest, type UpdateUserRequest } from '../api/users';

export const userKeys = {
	all: ['users'] as string[],
};

export function useUsers() {
	return useQuery({
		queryKey: userKeys.all,
		queryFn: async () => { const res = await usersApi.list(); return res.data; },
	});
}

export function useCreateUser() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateUserRequest) => usersApi.create(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
	});
}

export function useUpdateUser() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) => usersApi.update(id, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
	});
}

export function useToggleUser() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => usersApi.toggle(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
	});
}
