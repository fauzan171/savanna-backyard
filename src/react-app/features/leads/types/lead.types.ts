import type { BaseEntity, UserReference } from '@/react-app/features/shared/types/api.types';

// Lead source enum
export type LeadSource = 'WhatsApp' | 'Instagram' | 'Facebook' | 'TikTok' | 'Website' | 'WalkIn';

// Lead status enum
export type LeadStatus = 'New' | 'Contacted' | 'Negotiating' | 'Converted' | 'Lost';

// Lead priority enum
export type LeadPriority = 'Hot' | 'Warm' | 'Cold';

// Lead entity matching backend
export interface Lead extends BaseEntity {
	name: string;
	phone: string;
	email: string | null;
	source: LeadSource;
	status: LeadStatus;
	priority: LeadPriority;
	assignedTo: UserReference | null;
	followUpDate: string | null;
	convertedAt: string | null;
}

// Lead with notes (for detail page)
export interface LeadWithNotes extends Lead {
    notes: LeadNote[] | string | null;  // backend sends string
    booking: BookingReference | null;
}
export interface LeadNote {
	id: string;
	content: string;
	createdBy: UserReference;
	createdAt: string;
}

export interface BookingReference {
	id: string;
	bookingNumber: string;
	status: string;
	totalAmount: number;
}

// API request types
export interface CreateLeadRequest {
	name: string;
	phone: string;
	email?: string;
	source: LeadSource;
	priority?: LeadPriority;
	assignedTo?: string;
	notes?: string;
	followUpDate?: string;
}

export interface UpdateLeadRequest {
	status?: LeadStatus;
	priority?: LeadPriority;
	assignedTo?: string;
	followUpDate?: string;
}

export interface AddNoteRequest {
	content: string;
}

// Convert lead to booking
export type PaymentTerms = 'DP_Pickup' | 'Full_Upfront' | 'DP_After' | 'Flexible';

export interface ConvertToBookingRequest {
	customerId: string;
	vehicleId: string;
	startDate: string;
	endDate: string;
	paymentTerms: PaymentTerms;
	notes?: string;
}

export interface ConversionResult {
	lead: {
		id: string;
		status: LeadStatus;
		convertedAt: string;
	};
	booking: {
		id: string;
		bookingNumber: string;
		status: string;
		totalAmount: number;
	};
}

// List filters
export interface LeadFilters {
	search?: string;
	status?: LeadStatus;
	source?: LeadSource;
	priority?: LeadPriority;
	assignedTo?: string;
	followUpDue?: boolean;
}

// Statistics
export interface LeadStatistics {
	total: number;
	byStatus: Record<LeadStatus, number>;
	bySource: Record<LeadSource, number>;
	conversionRate: {
		overall: number;
		bySource: Record<LeadSource, number>;
	};
	followUpsDue: number;
}

// Reminders
export interface FollowUpReminders {
	overdue: Array<{
		id: string;
		name: string;
		phone: string;
		followUpDate: string;
		daysOverdue: number;
	}>;
	dueToday: Array<{
		id: string;
		name: string;
		phone: string;
		followUpDate: string;
	}>;
}

// Form types
export type LeadFormData = CreateLeadRequest;
