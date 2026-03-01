import { useApiQuery, useApiList, useApiCreate, useApiUpdate, useApiMutation } from '@/react-app/features/shared/hooks/useApi';
import { customerApi } from '../api/customerApi';
import type {
	Customer,
	CustomerWithHistory,
	CreateCustomerRequest,
	UpdateCustomerRequest,
	SetBlacklistRequest,
	CustomerFilters,
} from '../types/customer.types';

// Query keys for cache management (mutable arrays)
export const customerKeys = {
	all: ['customers'] as string[],
	list: (filters?: CustomerFilters) => ['customers', 'list', filters] as string[],
	detail: (id: string) => ['customers', 'detail', id] as string[],
};

// Hook for listing customers
export function useCustomers(params?: CustomerFilters & { page?: number; limit?: number }) {
	return useApiList<Customer>(
		customerKeys.list(params),
		'/v1/customers',
		params ? {
			...(params.page && { page: String(params.page) }),
			...(params.limit && { limit: String(params.limit) }),
			...(params.search && { search: params.search }),
			...(params.blacklist && { blacklist: params.blacklist }),
		} : undefined
	);
}

// Hook for single customer detail
export function useCustomer(id: string) {
	return useApiQuery<CustomerWithHistory>(
		customerKeys.detail(id),
		`/v1/customers/${id}`
	);
}

// Hook for creating customer
export function useCreateCustomer() {
	return useApiCreate<Customer, CreateCustomerRequest>(
		customerKeys.all,
		'/v1/customers'
	);
}

// Hook for updating customer
export function useUpdateCustomer() {
	return useApiUpdate<Customer, UpdateCustomerRequest>(
		customerKeys.all,
		'/v1/customers'
	);
}

// Hook for setting blacklist status
export function useSetBlacklist() {
	return useApiMutation<Customer, { id: string } & SetBlacklistRequest>(
		customerKeys.all,
		async ({ id, ...data }) => customerApi.setBlacklist(id, data)
	);
}
