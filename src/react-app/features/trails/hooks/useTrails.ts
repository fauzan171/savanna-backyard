import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trailsApi, type CreateTrailRequest, type UpdateTrailRequest } from '../api/trails';

export const trailKeys = {
	all: ['trails'] as string[],
	list: () => ['trails', 'list'] as string[],
	detail: (id: string) => ['trails', 'detail', id] as string[],
};

export function useTrails() {
	return useQuery({
		queryKey: trailKeys.list(),
		queryFn: async () => { const res = await trailsApi.list(); return res.data; },
	});
}

export function useTrail(id: string) {
	return useQuery({
		queryKey: trailKeys.detail(id),
		queryFn: async () => { const res = await trailsApi.getById(id); return res.data; },
		enabled: !!id,
	});
}

export function useCreateTrail() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateTrailRequest) => trailsApi.create(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: trailKeys.all }),
	});
}

export function useUpdateTrail() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateTrailRequest }) => trailsApi.update(id, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: trailKeys.all }),
	});
}

export function useDeleteTrail() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => trailsApi.delete(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: trailKeys.all }),
	});
}

export function useToggleTrail() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => trailsApi.toggle(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: trailKeys.all }),
	});
}
