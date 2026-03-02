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

export const paymentApi = {
	// ============================================
	// LIST & GET
	// ============================================

	/** List payments with filters and pagination */
	list: async (params?: PaymentFilters & { page?: number; limit?: number }) => {
		const searchParams: Record<string, string> = {};

		if (params?.page) searchParams.page = String(params.page);
		if (params?.limit) searchParams.limit = String(params.limit);
		if (params?.status) searchParams.status = params.status;
		if (params?.method) searchParams.method = params.method;
		if (params?.bookingId) searchParams.bookingId = params.bookingId;
		if (params?.dateFrom) searchParams.dateFrom = params.dateFrom;
		if (params?.dateTo) searchParams.dateTo = params.dateTo;
		if (params?.search) searchParams.search = params.search;

		return api.get<ApiPaginatedSuccessResponse<Payment>>(BASE_PATH, searchParams);
	},

	/** Get single payment by ID */
	getById: async (id: string) => {
		return api.get<ApiSuccessResponse<Payment>>(`${BASE_PATH}/${id}`);
	},

	/** Get payments by booking ID */
	getByBookingId: async (bookingId: string) => {
		return api.get<ApiSuccessResponse<Payment[]>>(`${BASE_PATH}/booking/${bookingId}`);
	},

	// ============================================
	// CREATE & UPDATE
	// ============================================

	/** Create new payment */
	create: async (data: CreatePaymentRequest) => {
		return api.post<ApiSuccessResponse<Payment>>(BASE_PATH, data);
	},

	/** Update payment */
	update: async (id: string, data: UpdatePaymentRequest) => {
		return api.patch<ApiSuccessResponse<Payment>>(`${BASE_PATH}/${id}`, data);
	},

	// ============================================
	// VERIFICATION
	// ============================================

	/** Verify or reject payment */
	verify: async (id: string, data: VerifyPaymentRequest) => {
		return api.post<ApiSuccessResponse<Payment>>(`${BASE_PATH}/${id}/verify`, data);
	},

	// ============================================
	// DELETE
	// ============================================

	/** Delete pending payment */
	delete: async (id: string) => {
		return api.delete<ApiSuccessResponse<{ deletedId: string }>>(`${BASE_PATH}/${id}`);
	},
};
