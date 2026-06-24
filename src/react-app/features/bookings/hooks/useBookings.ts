import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/react-app/lib/api-client';
import type {
	ApiSuccessResponse,
	ApiPaginatedSuccessResponse,
} from '@/react-app/features/shared/types/api.types';
import type {
	Booking,
	BookingWithDetails,
	BookingFilters,
	CreateBookingRequest,
	UpdateBookingRequest,
	ConfirmBookingRequest,
	StartRentalRequest,
	CompleteRentalRequest,
	CancelBookingRequest,
	ExtendBookingRequest,
	CreateAddonRequest,
	AvailabilityCheckParams,
	AvailabilityCheckResult,
	PriceCalculationParams,
	PriceCalculationResult,
	ExtensionCalculationParams,
	ExtensionCalculationResult,
	BookingAddon,
	PenaltyBreakdown,
	ScanReturnResult,
} from '../types/booking.types';

const BASE_PATH = '/v1/bookings';

// ============================================
// QUERY KEYS
// ============================================

export const bookingKeys = {
	all: ['bookings'],
	list: (filters?: BookingFilters) => ['bookings', 'list', filters],
	detail: (id: string) => ['bookings', 'detail', id],
	byNumber: (number: string) => ['bookings', 'number', number],
	penalties: (id: string) => ['bookings', 'penalties', id],
};

// ============================================
// QUERY HOOKS
// ============================================

/** List bookings with filters */
export function useBookings(params?: BookingFilters & { page?: number; limit?: number }) {
	const searchParams: Record<string, string> | undefined = params
		? {
				...(params.page && { page: String(params.page) }),
				...(params.limit && { limit: String(params.limit) }),
				...(params.status && { status: params.status }),
				...(params.customerId && { customerId: params.customerId }),
				...(params.vehicleId && { vehicleId: params.vehicleId }),
				...(params.startDateFrom && { startDateFrom: params.startDateFrom }),
				...(params.startDateTo && { startDateTo: params.startDateTo }),
				...(params.search && { search: params.search }),
		  }
		: undefined;

	return useQuery({
		queryKey: bookingKeys.list(params),
		queryFn: () =>
			api.get<ApiPaginatedSuccessResponse<Booking>>(BASE_PATH, searchParams),
		select: (data) => data.data,
	});
}

/** Get single booking by ID */
export function useBooking(id: string) {
	return useQuery({
		queryKey: bookingKeys.detail(id),
		queryFn: () =>
			api.get<ApiSuccessResponse<BookingWithDetails>>(`${BASE_PATH}/${id}`),
		select: (data) => data.data,
		enabled: !!id,
	});
}

/** Get booking by booking number */
export function useBookingByNumber(bookingNumber: string) {
	return useQuery({
		queryKey: bookingKeys.byNumber(bookingNumber),
		queryFn: () =>
			api.get<ApiSuccessResponse<BookingWithDetails>>(
				`${BASE_PATH}/number/${encodeURIComponent(bookingNumber)}`
			),
		select: (data) => data.data,
		enabled: !!bookingNumber,
	});
}

// ============================================
// MUTATION HOOKS
// ============================================

/** Create new booking */
export function useCreateBooking() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateBookingRequest) =>
			api.post<ApiSuccessResponse<Booking>>(BASE_PATH, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: bookingKeys.all });
		},
	});
}

/** Update booking */
export function useUpdateBooking() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateBookingRequest }) =>
			api.patch<ApiSuccessResponse<Booking>>(`${BASE_PATH}/${id}`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: bookingKeys.all });
		},
	});
}

/** Confirm booking */
export function useConfirmBooking() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, ...data }: { id: string } & ConfirmBookingRequest) =>
			api.post<ApiSuccessResponse<Booking>>(`${BASE_PATH}/${id}/confirm`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: bookingKeys.all });
		},
	});
}

/** Start rental */
export function useStartRental() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, ...data }: { id: string } & StartRentalRequest) =>
			api.post<ApiSuccessResponse<Booking>>(`${BASE_PATH}/${id}/start`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: bookingKeys.all });
		},
	});
}

/** Complete rental */
export function useCompleteRental() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, ...data }: { id: string } & CompleteRentalRequest) =>
			api.post<ApiSuccessResponse<Booking>>(`${BASE_PATH}/${id}/complete`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: bookingKeys.all });
		},
	});
}

/** Get penalty breakdown (late fee + damage fee) for a booking */
export function usePenalties(id: string) {
	return useQuery<ApiSuccessResponse<PenaltyBreakdown>, Error, PenaltyBreakdown>({
		queryKey: bookingKeys.penalties(id),
		queryFn: () => api.get<ApiSuccessResponse<PenaltyBreakdown>>(`${BASE_PATH}/${id}/penalties`),
		select: (res) => res.data,
	});
}

/** Mark a booking's penalty as paid */
export function useMarkPenaltyPaid() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) =>
			api.post<ApiSuccessResponse<Booking>>(`${BASE_PATH}/${id}/penalties/mark-paid`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: bookingKeys.all });
		},
	});
}

/** Scan a vehicle QR to resolve the active rental (admin return processing) */
export function useScanReturn() {
	return useMutation({
		mutationFn: (qrCode: string) =>
			api.post<ApiSuccessResponse<ScanReturnResult>>(`${BASE_PATH}/scan-return`, { qrCode }),
	});
}

/** Cancel booking */
export function useCancelBooking() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, ...data }: { id: string } & CancelBookingRequest) =>
			api.post<ApiSuccessResponse<Booking>>(`${BASE_PATH}/${id}/cancel`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: bookingKeys.all });
		},
	});
}

/** Extend booking */
export function useExtendBooking() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, ...data }: { id: string } & ExtendBookingRequest) =>
			api.post<ApiSuccessResponse<Booking>>(`${BASE_PATH}/${id}/extend`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: bookingKeys.all });
		},
	});
}

/** Add add-on to booking */
export function useAddBookingAddon() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ bookingId, ...data }: { bookingId: string } & CreateAddonRequest) =>
			api.post<ApiSuccessResponse<BookingAddon>>(
				`${BASE_PATH}/${bookingId}/addons`,
				data
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: bookingKeys.all });
		},
	});
}

/** Remove add-on from booking */
export function useRemoveBookingAddon() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ bookingId, addonId }: { bookingId: string; addonId: string }) =>
			api.delete<ApiSuccessResponse<{ removedAddonId: string }>>(
				`${BASE_PATH}/${bookingId}/addons/${addonId}`
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: bookingKeys.all });
		},
	});
}

// ============================================
// AVAILABILITY & PRICING HOOKS (No caching)
// ============================================

/** Check vehicle availability */
export function useCheckAvailability() {
	return useMutation({
		mutationFn: async (params: AvailabilityCheckParams) => {
			const searchParams: Record<string, string> = {
				vehicleId: params.vehicleId,
				startDate: params.startDate,
				endDate: params.endDate,
			};
			if (params.excludeBookingId) {
				searchParams.excludeBookingId = params.excludeBookingId;
			}
			const result = await api.get<ApiSuccessResponse<AvailabilityCheckResult>>(
				`${BASE_PATH}/check-availability`,
				searchParams
			);
			return result.data;
		},
	});
}

/** Calculate booking price */
export function useCalculatePrice() {
	return useMutation({
		mutationFn: async (params: PriceCalculationParams) => {
			const result = await api.post<ApiSuccessResponse<PriceCalculationResult>>(
				`${BASE_PATH}/calculate-price`,
				params
			);
			return result.data;
		},
	});
}

/** Calculate extension price */
export function useCalculateExtension() {
	return useMutation({
		mutationFn: async (params: ExtensionCalculationParams) => {
			const result = await api.post<ApiSuccessResponse<ExtensionCalculationResult>>(
				`${BASE_PATH}/${params.bookingId}/calculate-extension`,
				{ newEndDate: params.newEndDate }
			);
			return result.data;
		},
	});
}
