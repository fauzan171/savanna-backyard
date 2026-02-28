import { LeadsRepository } from './leads.repository';
import { NotFoundError, ValidationError } from '@/worker/core/types/errors';
import type {
	LeadResponse,
	LeadWithDetails,
	LeadStats,
	LeadSource,
} from './leads.types';
import type {
	CreateLeadRequest,
	UpdateLeadRequest,
	UpdateLeadStatusRequest,
	AddNoteRequest,
	ListLeadsQuery,
} from './leads.dto';
import type { Lead } from '@/worker/core/database/schema';

export class LeadsService {
	constructor(private leadRepo: LeadsRepository) {}

	// Transform lead to response format
	private toResponse(lead: Lead): LeadResponse {
		return {
			id: lead.id,
			name: lead.name,
			phone: lead.phone,
			email: lead.email,
			notes: lead.notes,
			source: lead.source,
			status: lead.status,
			priority: lead.priority,
			assignedTo: lead.assignedTo,
			followUpDate: lead.followUpDate,
			convertedAt: lead.convertedAt,
			createdAt: lead.createdAt,
		};
	}

	async list(query: ListLeadsQuery): Promise<{
		items: LeadWithDetails[];
		meta: { page: number; limit: number; total: number; totalPages: number };
	}> {
		const { items, total } = await this.leadRepo.list(query);
		const totalPages = Math.ceil(total / query.limit);

		// TODO: Fetch user details for assignedTo when user service is available
		const itemsWithDetails: LeadWithDetails[] = items.map(lead => ({
			...this.toResponse(lead),
			assignedToUser: lead.assignedTo ? { id: lead.assignedTo, name: 'Unknown' } : null,
			convertedBooking: null,
		}));

		return {
			items: itemsWithDetails,
			meta: {
				page: query.page,
				limit: query.limit,
				total,
				totalPages,
			},
		};
	}

	async getById(id: string): Promise<LeadWithDetails | null> {
		const lead = await this.leadRepo.findById(id);
		if (!lead) {
			return null;
		}

		// TODO: Fetch user details and booking info when modules are available
		return {
			...this.toResponse(lead),
			assignedToUser: lead.assignedTo ? { id: lead.assignedTo, name: 'Unknown' } : null,
			convertedBooking: null,
		};
	}

	async create(data: CreateLeadRequest): Promise<LeadResponse> {
		const lead = await this.leadRepo.create({
			name: data.name,
			phone: data.phone,
			email: data.email ?? null,
			notes: data.notes ?? null,
			source: data.source,
			status: 'New',
			priority: data.priority,
			assignedTo: data.assignedTo ?? null,
			followUpDate: data.followUpDate ?? null,
		});

		return this.toResponse(lead);
	}

	async update(id: string, data: UpdateLeadRequest): Promise<LeadResponse> {
		const existing = await this.leadRepo.findById(id);
		if (!existing) {
			throw new NotFoundError('Lead');
		}

		// Don't allow updating converted leads
		if (existing.status === 'Converted') {
			throw new ValidationError('Cannot update converted leads');
		}

		const lead = await this.leadRepo.update(id, {
			name: data.name,
			phone: data.phone,
			email: data.email,
			notes: data.notes,
			priority: data.priority,
			assignedTo: data.assignedTo,
			followUpDate: data.followUpDate,
		});

		if (!lead) {
			throw new NotFoundError('Lead');
		}

		return this.toResponse(lead);
	}

	async updateStatus(id: string, data: UpdateLeadStatusRequest): Promise<LeadResponse> {
		const existing = await this.leadRepo.findById(id);
		if (!existing) {
			throw new NotFoundError('Lead');
		}

		// Don't allow status changes on converted leads
		if (existing.status === 'Converted' && data.status !== 'Converted') {
			throw new ValidationError('Cannot change status of converted leads');
		}

		let lead = await this.leadRepo.updateStatus(id, data.status);

		// Append status change note if provided
		if (data.notes && lead) {
			lead = await this.leadRepo.appendNote(id, data.notes, lead.notes);
		}

		if (!lead) {
			throw new NotFoundError('Lead');
		}

		return this.toResponse(lead);
	}

	async addNote(id: string, data: AddNoteRequest): Promise<LeadResponse> {
		const existing = await this.leadRepo.findById(id);
		if (!existing) {
			throw new NotFoundError('Lead');
		}

		const lead = await this.leadRepo.appendNote(id, data.note, existing.notes);

		if (!lead) {
			throw new NotFoundError('Lead');
		}

		return this.toResponse(lead);
	}

	async assignToUser(id: string, userId: string | null): Promise<LeadResponse> {
		const existing = await this.leadRepo.findById(id);
		if (!existing) {
			throw new NotFoundError('Lead');
		}

		const lead = await this.leadRepo.update(id, { assignedTo: userId });

		if (!lead) {
			throw new NotFoundError('Lead');
		}

		return this.toResponse(lead);
	}

	async getStats(): Promise<LeadStats> {
		const stats = await this.leadRepo.getStats();

		const convertedCount = stats.byStatus['Converted'] || 0;
		const conversionRate = stats.total > 0
			? Math.round((convertedCount / stats.total) * 100)
			: 0;

		const bySource = Object.entries(stats.bySource).map(([source, data]) => ({
			source: source as LeadSource,
			count: data.count,
			converted: data.converted,
		}));

		return {
			total: stats.total,
			byStatus: stats.byStatus as LeadStats['byStatus'],
			bySource,
			byPriority: stats.byPriority as LeadStats['byPriority'],
			conversionRate,
			followUpsDue: stats.followUpsDue,
		};
	}

	// Internal method for checking if lead exists
	async checkExists(id: string): Promise<boolean> {
		const lead = await this.leadRepo.findById(id);
		return lead !== null;
	}
}
