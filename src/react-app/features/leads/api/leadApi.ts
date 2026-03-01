import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse, ApiPaginatedSuccessResponse } from '@/react-app/features/shared/types/api.types';
import type {
	Lead,
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

const BASE_PATH = '/v1/leads';

export const leadApi = {
	// List leads with pagination
	list: async (params?: LeadFilters & { page?: number; limit?: number }) => {
		const searchParams: Record<string, string> = {};
		if (params?.page) searchParams.page = String(params.page);
		if (params?.limit) searchParams.limit = String(params.limit);
		if (params?.search) searchParams.search = params.search;
		if (params?.status) searchParams.status = params.status;
		if (params?.source) searchParams.source = params.source;
		if (params?.priority) searchParams.priority = params.priority;
		if (params?.assignedTo) searchParams.assignedTo = params.assignedTo;
		if (params?.followUpDue) searchParams.followUpDue = 'true';

		return api.get<ApiPaginatedSuccessResponse<Lead>>(BASE_PATH, searchParams);
	},

	// Get single lead by ID
	getById: async (id: string) => {
		return api.get<ApiSuccessResponse<LeadWithNotes>>(`${BASE_PATH}/${id}`);
	},

	// Create new lead
	create: async (data: CreateLeadRequest) => {
		return api.post<ApiSuccessResponse<Lead>>(BASE_PATH, data);
	},

	// Update lead
	update: async (id: string, data: UpdateLeadRequest) => {
		return api.patch<ApiSuccessResponse<Lead>>(`${BASE_PATH}/${id}`, data);
	},

	// Add note to lead
	addNote: async (id: string, data: AddNoteRequest) => {
		return api.post<ApiSuccessResponse<LeadWithNotes['notes'][0]>>(`${BASE_PATH}/${id}/notes`, data);
	},

	// Convert lead to booking
	convertToBooking: async (id: string, data: ConvertToBookingRequest) => {
		return api.post<ApiSuccessResponse<ConversionResult>>(`${BASE_PATH}/${id}/convert`, data);
	},

	// Get statistics
	getStatistics: async (params?: { startDate?: string; endDate?: string; groupBy?: string }) => {
		const searchParams: Record<string, string> = {};
		if (params?.startDate) searchParams.startDate = params.startDate;
		if (params?.endDate) searchParams.endDate = params.endDate;
		if (params?.groupBy) searchParams.groupBy = params.groupBy;

		return api.get<ApiSuccessResponse<LeadStatistics>>(`${BASE_PATH}/statistics`, searchParams);
	},

	// Get follow-up reminders
	getReminders: async () => {
		return api.get<ApiSuccessResponse<FollowUpReminders>>(`${BASE_PATH}/reminders`);
	},
};
