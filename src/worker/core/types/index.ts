// API Response Types

export interface ApiResponse<T> {
	success: true;
	data: T;
	message?: string;
	meta?: {
		page?: number;
		limit?: number;
		total?: number;
	};
}

export interface ApiError {
	success: false;
	message: string;
	error: {
		message: string;
		code: string;
		details?: unknown;
	};
}

export interface PaginationParams {
	page: number;
	limit: number;
}

// JWT Payload
export interface JwtPayload {
	userId: string;
	role: 'SUPER_ADMIN' | 'STAFF';
	jti: string; // Unique token ID for revocation
	iat?: number;
	exp?: number;
}

// User context set by auth middleware
export interface UserContext {
	userId: string;
	role: 'SUPER_ADMIN' | 'STAFF';
}
