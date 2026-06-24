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
} from '../types/booking.types';

const BASE_PATH = '/v1/bookings';

export const bookingApi = {
	// ============================================
	// LIST & GET
	// ============================================

	/** List bookings with filters and pagination */
	list: async (params?: BookingFilters & { page?: number; limit?: number }) => {
		const searchParams: Record<string, string> = {};

		if (params?.page) searchParams.page = String(params.page);
		if (params?.limit) searchParams.limit = String(params.limit);
		if (params?.status) searchParams.status = params.status;
		if (params?.customerId) searchParams.customerId = params.customerId;
		if (params?.vehicleId) searchParams.vehicleId = params.vehicleId;
		if (params?.startDateFrom) searchParams.startDateFrom = params.startDateFrom;
		if (params?.startDateTo) searchParams.startDateTo = params.startDateTo;
		if (params?.search) searchParams.search = params.search;

		return api.get<ApiPaginatedSuccessResponse<Booking>>(BASE_PATH, searchParams);
	},

	/** Get single booking by ID */
	getById: async (id: string) => {
		return api.get<ApiSuccessResponse<BookingWithDetails>>(`${BASE_PATH}/${id}`);
	},

	/** Get booking by booking number */
	getByNumber: async (bookingNumber: string) => {
		return api.get<ApiSuccessResponse<BookingWithDetails>>(
			`${BASE_PATH}/number/${encodeURIComponent(bookingNumber)}`
		);
	},

	// ============================================
	// CREATE & UPDATE
	// ============================================

	/** Create new booking */
	create: async (data: CreateBookingRequest) => {
		return api.post<ApiSuccessResponse<Booking>>(BASE_PATH, data);
	},

	/** Update booking notes */
	update: async (id: string, data: UpdateBookingRequest) => {
		return api.patch<ApiSuccessResponse<Booking>>(`${BASE_PATH}/${id}`, data);
	},

	// ============================================
	// STATUS ACTIONS
	// ============================================

	/** Confirm a pending booking */
	confirm: async (id: string, data?: ConfirmBookingRequest) => {
		return api.post<ApiSuccessResponse<Booking>>(`${BASE_PATH}/${id}/confirm`, data);
	},

	/** Start rental (mark as active) */
	startRental: async (id: string, data?: StartRentalRequest) => {
		return api.post<ApiSuccessResponse<Booking>>(`${BASE_PATH}/${id}/start`, data);
	},

	/** Complete rental (mark as completed) */
	completeRental: async (id: string, data: CompleteRentalRequest) => {
		return api.post<ApiSuccessResponse<Booking>>(`${BASE_PATH}/${id}/complete`, data);
	},

	/** Cancel booking */
	cancel: async (id: string, data: CancelBookingRequest) => {
		return api.post<ApiSuccessResponse<Booking>>(`${BASE_PATH}/${id}/cancel`, data);
	},

	/** Get penalty breakdown (late fee + damage fee) for a booking */
	getPenalties: async (id: string) => {
		return api.get<ApiSuccessResponse<PenaltyBreakdown>>(`${BASE_PATH}/${id}/penalties`);
	},

	/** Mark a booking's penalty as paid */
	markPenaltyPaid: async (id: string) => {
		return api.post<ApiSuccessResponse<Booking>>(`${BASE_PATH}/${id}/penalties/mark-paid`);
	},

	/** Extend booking */
	extend: async (id: string, data: ExtendBookingRequest) => {
		return api.post<ApiSuccessResponse<Booking>>(`${BASE_PATH}/${id}/extend`, data);
	},

	// ============================================
	// ADD-ONS
	// ============================================

	/** Add add-on to booking */
	addAddon: async (bookingId: string, data: CreateAddonRequest) => {
		return api.post<ApiSuccessResponse<BookingAddon>>(
			`${BASE_PATH}/${bookingId}/addons`,
			data
		);
	},

	/** Remove add-on from booking */
	removeAddon: async (bookingId: string, addonId: string) => {
		return api.delete<ApiSuccessResponse<{ removedAddonId: string }>>(
			`${BASE_PATH}/${bookingId}/addons/${addonId}`
		);
	},

	// ============================================
	// AVAILABILITY & PRICING
	// ============================================

	/** Check vehicle availability */
	checkAvailability: async (params: AvailabilityCheckParams) => {
		const searchParams: Record<string, string> = {
			vehicleId: params.vehicleId,
			startDate: params.startDate,
			endDate: params.endDate,
		};

		if (params.excludeBookingId) {
			searchParams.excludeBookingId = params.excludeBookingId;
		}

		return api.get<ApiSuccessResponse<AvailabilityCheckResult>>(
			`${BASE_PATH}/check-availability`,
			searchParams
		);
	},

	/** Calculate booking price */
	calculatePrice: async (params: PriceCalculationParams) => {
		return api.post<ApiSuccessResponse<PriceCalculationResult>>(
			`${BASE_PATH}/calculate-price`,
			params
		);
	},

	/** Calculate extension price */
	calculateExtension: async (params: ExtensionCalculationParams) => {
		return api.post<ApiSuccessResponse<ExtensionCalculationResult>>(
			`${BASE_PATH}/${params.bookingId}/calculate-extension`,
			{ newEndDate: params.newEndDate }
		);
	},
};
