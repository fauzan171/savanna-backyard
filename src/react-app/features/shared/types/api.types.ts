// Common API response types matching backend structure

export interface ApiSuccessResponse<T> {
	success: true;
	data: T;
}

export interface ApiErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
	};
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginatedMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface PaginatedResponse<T> {
	items: T[];
	meta: PaginatedMeta;
}

export interface ApiPaginatedSuccessResponse<T> {
	success: true;
	data: PaginatedResponse<T>;
}

// Common filter types
export interface PaginationParams {
	page?: number;
	limit?: number;
}

export interface SearchParams {
	search?: string;
}

// Common entity types
export interface BaseEntity {
	id: string;
	createdAt: string;
	updatedAt?: string;
}

// User reference (for assignedTo, createdBy, etc.)
export interface UserReference {
	id: string;
	name: string;
	email?: string;
	role?: 'SUPER_ADMIN' | 'STAFF';
}
