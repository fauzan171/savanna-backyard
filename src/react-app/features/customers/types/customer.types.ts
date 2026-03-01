import type { BaseEntity } from '@/react-app/features/shared/types/api.types';

// Customer entity matching backend
export interface Customer extends BaseEntity {
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
}

// Customer with rental history (for detail page)
export interface CustomerWithHistory extends Customer {
	rentalHistory: RentalHistoryItem[];
}

export interface RentalHistoryItem {
	bookingId: string;
	vehicleName: string;
	startDate: string;
	endDate: string;
	status: 'Pending' | 'Confirmed' | 'Active' | 'Completed' | 'Cancelled';
}

// API request types
export interface CreateCustomerRequest {
	name: string;
	phone: string;
	email?: string;
	address?: string;
	identityType?: 'KTP' | 'SIM' | 'Passport';
	identityNumber?: string;
	identityPhotoUrl?: string;
	notes?: string;
}

export interface UpdateCustomerRequest {
	name?: string;
	phone?: string;
	email?: string;
	address?: string;
	identityType?: 'KTP' | 'SIM' | 'Passport';
	identityNumber?: string;
	identityPhotoUrl?: string;
	notes?: string;
}

export interface SetBlacklistRequest {
	isBlacklisted: boolean;
	reason?: string;
}

// List filters
export interface CustomerFilters {
	search?: string;
	blacklist?: 'true' | 'false';
}

// Form types
export type CustomerFormData = CreateCustomerRequest;
