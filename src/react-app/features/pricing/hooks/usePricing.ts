import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pricingApi, type CreatePricingRequest, type UpdatePricingRequest } from '../api/pricing';

export const pricingKeys = {
	all: ['pricing'] as string[],
	list: () => ['pricing', 'list'] as string[],
	detail: (id: string) => ['pricing', 'detail', id] as string[],
};

export function usePricingTiers() {
	return useQuery({
		queryKey: pricingKeys.list(),
		queryFn: async () => { const res = await pricingApi.list(); return res.data; },
	});
}

export function usePricingTier(id: string) {
	return useQuery({
		queryKey: pricingKeys.detail(id),
		queryFn: async () => { const res = await pricingApi.getById(id); return res.data; },
		enabled: !!id,
	});
}

export function useCreatePricing() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: CreatePricingRequest) => pricingApi.create(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: pricingKeys.all }),
	});
}

export function useUpdatePricing() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdatePricingRequest }) => pricingApi.update(id, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: pricingKeys.all }),
	});
}

export function useDeletePricing() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => pricingApi.delete(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: pricingKeys.all }),
	});
}

export function useTogglePricing() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => pricingApi.toggle(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: pricingKeys.all }),
	});
}
