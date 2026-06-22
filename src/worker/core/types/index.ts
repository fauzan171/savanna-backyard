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
	// Token type discriminator: 'admin' (panel staff) vs 'public' (landing-page end-user).
	// Absent on pre-existing admin tokens => treated as 'admin' (backward compatible).
	type?: 'admin' | 'public';
	role?: 'SUPER_ADMIN' | 'STAFF'; // admin tokens only; absent for public-user tokens
	jti: string; // Unique token ID for revocation
	iat?: number;
	exp?: number;
}

// User context set by authMiddleware (admin only)
export interface UserContext {
	userId: string;
	role: 'SUPER_ADMIN' | 'STAFF';
}

// Public end-user context set by publicUserAuthMiddleware (distinct from admin UserContext)
export interface PublicUserContext {
	publicUserId: string;
	email: string;
	name: string;
	phone: string | null;
	phoneVerified: boolean;
}
