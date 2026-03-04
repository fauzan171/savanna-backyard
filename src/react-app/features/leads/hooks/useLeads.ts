import { useApiQuery, useApiList, useApiCreate, useApiUpdate, useApiMutation } from '@/react-app/features/shared/hooks/useApi';
import { leadApi } from '../api/leadApi';
import type {
	Lead,
	LeadNote,
	LeadWithNotes,
	CreateLeadRequest,
	UpdateLeadRequest,
	AddNoteRequest,
	ConvertToBookingRequest,
	ConversionResult,
	LeadFilters,
	LeadStatistics,
	FollowUpReminders,
} from '../types/lead.types';

// Query keys for cache management
export const leadKeys = {
	all: ['leads'] as string[],
	list: (filters?: LeadFilters) => ['leads', 'list', filters] as string[],
	detail: (id: string) => ['leads', 'detail', id] as string[],
	statistics: ['leads', 'statistics'] as string[],
	reminders: ['leads', 'reminders'] as string[],
};

// Hook for listing leads
export function useLeads(params?: LeadFilters & { page?: number; limit?: number }) {
	return useApiList<Lead>(
		leadKeys.list(params),
		'/v1/leads',
		params ? {
			...(params.page && { page: String(params.page) }),
			...(params.limit && { limit: String(params.limit) }),
			...(params.search && { search: params.search }),
			...(params.status && { status: params.status }),
			...(params.source && { source: params.source }),
			...(params.priority && { priority: params.priority }),
			...(params.assignedTo && { assignedTo: params.assignedTo }),
			...(params.followUpDue && { followUpDue: 'true' }),
		} : undefined
	);
}

// Hook for single lead detail
export function useLead(id: string) {
	return useApiQuery<LeadWithNotes>(
		leadKeys.detail(id),
		`/v1/leads/${id}`
	);
}

// Hook for creating lead
export function useCreateLead() {
	return useApiCreate<Lead, CreateLeadRequest>(
		leadKeys.all,
		'/v1/leads'
	);
}

// Hook for updating lead
export function useUpdateLead() {
	return useApiUpdate<Lead, UpdateLeadRequest>(
		leadKeys.all,
		'/v1/leads'
	);
}

// Hook for adding note
export function useAddNote(id: string) {
	return useApiMutation<LeadNote, AddNoteRequest>(
		leadKeys.detail(id),
		async (data) => leadApi.addNote(id, data)
	);
}

// Hook for converting to booking
export function useConvertToBooking(id: string) {
	return useApiMutation<ConversionResult, ConvertToBookingRequest>(
		[...leadKeys.all, 'conversion'] as string[],
		async (data) => leadApi.convertToBooking(id, data)
	);
}

// Hook for statistics
export function useLeadStatistics(params?: { startDate?: string; endDate?: string }) {
	return useApiQuery<LeadStatistics>(
		leadKeys.statistics,
		'/v1/leads/statistics',
		params ? {
			...(params.startDate && { startDate: params.startDate }),
			...(params.endDate && { endDate: params.endDate }),
		} : undefined
	);
}

// Hook for reminders
export function useLeadReminders() {
	return useApiQuery<FollowUpReminders>(
		leadKeys.reminders,
		'/v1/leads/reminders'
	);
}