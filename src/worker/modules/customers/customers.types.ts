// Re-export from database schema
export type { Customer, NewCustomer } from '@/worker/core/database/schema';

// API-specific types (exclude sensitive fields)
export interface CustomerResponse {
	id: string;
	name: string;
	phone: string;
	email: string | null;
	address: string | null;
	identityType: 'KTP' | 'SIM' | 'Passport' | null;
	identityNumber: string | null;
	identityPhotoUrl: string | null;
	notes: string | null;
	isBlacklisted: boolean;
	blacklistReason: string | null;
	createdAt: string;
}

export interface CustomerWithHistory extends CustomerResponse {
	rentalHistory: {
		bookingId: string;
		vehicleName: string;
		startDate: string;
		endDate: string;
		status: string;
	}[];
}

export interface CustomerBasic {
	id: string;
	name: string;
	phone: string;
	isBlacklisted: boolean;
}
