import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse, ApiPaginatedSuccessResponse } from '@/react-app/features/shared/types/api.types';
import type {
	Customer,
	CustomerWithHistory,
	CreateCustomerRequest,
	UpdateCustomerRequest,
	SetBlacklistRequest,
	CustomerFilters,
} from '../types/customer.types';

const BASE_PATH = '/v1/customers';

export const customerApi = {
	// List customers with pagination
	list: async (params?: CustomerFilters & { page?: number; limit?: number }) => {
		const searchParams: Record<string, string> = {};
		if (params?.page) searchParams.page = String(params.page);
		if (params?.limit) searchParams.limit = String(params.limit);
		if (params?.search) searchParams.search = params.search;
		if (params?.blacklist) searchParams.blacklist = params.blacklist;

		return api.get<ApiPaginatedSuccessResponse<Customer>>(BASE_PATH, searchParams);
	},

	// Get single customer by ID
	getById: async (id: string) => {
		return api.get<ApiSuccessResponse<CustomerWithHistory>>(`${BASE_PATH}/${id}`);
	},

	// Get customer by phone (for quick lookup)
	getByPhone: async (phone: string) => {
		return api.get<ApiSuccessResponse<Customer>>(`${BASE_PATH}/by-phone/${encodeURIComponent(phone)}`);
	},

	// Create new customer
	create: async (data: CreateCustomerRequest) => {
		return api.post<ApiSuccessResponse<Customer>>(BASE_PATH, data);
	},

	// Update customer
	update: async (id: string, data: UpdateCustomerRequest) => {
		return api.patch<ApiSuccessResponse<Customer>>(`${BASE_PATH}/${id}`, data);
	},

	// Set blacklist status
	setBlacklist: async (id: string, data: SetBlacklistRequest) => {
		return api.patch<ApiSuccessResponse<Customer>>(`${BASE_PATH}/${id}/blacklist`, data);
	},
};
