import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi, type CreateReviewRequest, type UpdateReviewRequest } from '../api/reviews';

export const reviewKeys = {
	all: ['reviews'] as string[],
	list: () => ['reviews', 'list'] as string[],
	detail: (id: string) => ['reviews', 'detail', id] as string[],
};

export function useReviews() {
	return useQuery({
		queryKey: reviewKeys.list(),
		queryFn: async () => { const res = await reviewsApi.list(); return res.data; },
	});
}

export function useReview(id: string) {
	return useQuery({
		queryKey: reviewKeys.detail(id),
		queryFn: async () => { const res = await reviewsApi.getById(id); return res.data; },
		enabled: !!id,
	});
}

export function useCreateReview() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateReviewRequest) => reviewsApi.create(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all }),
	});
}

export function useUpdateReview() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateReviewRequest }) => reviewsApi.update(id, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all }),
	});
}

export function useDeleteReview() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => reviewsApi.delete(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all }),
	});
}

export function useToggleReview() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => reviewsApi.toggle(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all }),
	});
}
