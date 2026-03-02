import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/react-app/lib/api-client';
import type {
	ApiSuccessResponse,
	ApiPaginatedSuccessResponse,
} from '@/react-app/features/shared/types/api.types';
import type {
	Payment,
	PaymentFilters,
	CreatePaymentRequest,
	UpdatePaymentRequest,
	VerifyPaymentRequest,
} from '../types/payment.types';

const BASE_PATH = '/v1/payments';

// ============================================
// QUERY KEYS
// ============================================

export const paymentKeys = {
	all: ['payments'],
	list: (filters?: PaymentFilters) => ['payments', 'list', filters],
	detail: (id: string) => ['payments', 'detail', id],
	byBooking: (bookingId: string) => ['payments', 'booking', bookingId],
};

// ============================================
// QUERY HOOKS
// ============================================

/** List payments with filters */
export function usePayments(params?: PaymentFilters & { page?: number; limit?: number }) {
	const searchParams: Record<string, string> | undefined = params
		? {
				...(params.page && { page: String(params.page) }),
				...(params.limit && { limit: String(params.limit) }),
				...(params.status && { status: params.status }),
				...(params.method && { method: params.method }),
				...(params.bookingId && { bookingId: params.bookingId }),
				...(params.dateFrom && { dateFrom: params.dateFrom }),
				...(params.dateTo && { dateTo: params.dateTo }),
				...(params.search && { search: params.search }),
		  }
		: undefined;

	return useQuery({
		queryKey: paymentKeys.list(params),
		queryFn: () =>
			api.get<ApiPaginatedSuccessResponse<Payment>>(BASE_PATH, searchParams),
		select: (data) => data.data,
	});
}

/** Get single payment by ID */
export function usePayment(id: string) {
	return useQuery({
		queryKey: paymentKeys.detail(id),
		queryFn: () =>
			api.get<ApiSuccessResponse<Payment>>(`${BASE_PATH}/${id}`),
		select: (data) => data.data,
		enabled: !!id,
	});
}

/** Get payments by booking ID */
export function usePaymentsByBooking(bookingId: string) {
	return useQuery({
		queryKey: paymentKeys.byBooking(bookingId),
		queryFn: () =>
			api.get<ApiSuccessResponse<Payment[]>>(`${BASE_PATH}/booking/${bookingId}`),
		select: (data) => data.data,
		enabled: !!bookingId,
	});
}

// ============================================
// MUTATION HOOKS
// ============================================

/** Create new payment */
export function useCreatePayment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreatePaymentRequest) =>
			api.post<ApiSuccessResponse<Payment>>(BASE_PATH, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: paymentKeys.all });
		},
	});
}

/** Update payment */
export function useUpdatePayment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdatePaymentRequest }) =>
			api.patch<ApiSuccessResponse<Payment>>(`${BASE_PATH}/${id}`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: paymentKeys.all });
		},
	});
}

/** Verify or reject payment */
export function useVerifyPayment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, ...data }: { id: string } & VerifyPaymentRequest) =>
			api.post<ApiSuccessResponse<Payment>>(`${BASE_PATH}/${id}/verify`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: paymentKeys.all });
		},
	});
}

/** Delete pending payment */
export function useDeletePayment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) =>
			api.delete<ApiSuccessResponse<{ deletedId: string }>>(`${BASE_PATH}/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: paymentKeys.all });
		},
	});
}
