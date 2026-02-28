// Re-export from database schema
export type { Lead, NewLead } from '@/worker/core/database/schema';

// Lead source enum
export type LeadSource = 'WhatsApp' | 'Instagram' | 'Facebook' | 'TikTok' | 'Website' | 'WalkIn';
export type LeadStatus = 'New' | 'Contacted' | 'Negotiating' | 'Converted' | 'Lost';
export type LeadPriority = 'Hot' | 'Warm' | 'Cold';

// API-specific types
export interface LeadResponse {
	id: string;
	name: string;
	phone: string;
	email: string | null;
	notes: string | null;
	source: LeadSource;
	status: LeadStatus;
	priority: LeadPriority;
	assignedTo: string | null;
	followUpDate: string | null;
	convertedAt: string | null;
	createdAt: string;
}

export interface LeadWithDetails extends LeadResponse {
	assignedToUser?: {
		id: string;
		name: string;
	} | null;
	convertedBooking?: {
		id: string;
		bookingNumber: string;
		status: string;
	} | null;
}

export interface LeadStats {
	total: number;
	byStatus: Record<LeadStatus, number>;
	bySource: { source: LeadSource; count: number; converted: number }[];
	byPriority: Record<LeadPriority, number>;
	conversionRate: number;
	followUpsDue: number;
}
