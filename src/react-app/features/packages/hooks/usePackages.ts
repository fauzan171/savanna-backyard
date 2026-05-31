import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { packagesApi, type CreatePackageRequest, type UpdatePackageRequest } from '../api/packages';

export const packageKeys = {
	all: ['packages'] as string[],
	list: () => ['packages', 'list'] as string[],
	detail: (id: string) => ['packages', 'detail', id] as string[],
};

export function usePackages() {
	return useQuery({
		queryKey: packageKeys.list(),
		queryFn: async () => { const res = await packagesApi.list(); return res.data; },
	});
}

export function usePackage(id: string) {
	return useQuery({
		queryKey: packageKeys.detail(id),
		queryFn: async () => { const res = await packagesApi.getById(id); return res.data; },
		enabled: !!id,
	});
}

export function useCreatePackage() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreatePackageRequest) => packagesApi.create(data),
		onSuccess: () => { queryClient.invalidateQueries({ queryKey: packageKeys.all }); },
	});
}

export function useUpdatePackage() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdatePackageRequest }) => packagesApi.update(id, data),
		onSuccess: () => { queryClient.invalidateQueries({ queryKey: packageKeys.all }); },
	});
}

export function useDeletePackage() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => packagesApi.delete(id),
		onSuccess: () => { queryClient.invalidateQueries({ queryKey: packageKeys.all }); },
	});
}

export function useTogglePackage() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => packagesApi.toggle(id),
		onSuccess: () => { queryClient.invalidateQueries({ queryKey: packageKeys.all }); },
	});
}
