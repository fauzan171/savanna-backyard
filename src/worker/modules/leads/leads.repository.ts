import { eq, or, like, and, desc, isNotNull, lte } from 'drizzle-orm';
import { leads, type Lead, type NewLead } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';
import type { ListLeadsQuery } from './leads.dto';

export class LeadsRepository {
	constructor(private db: Database) {}

	async findById(id: string): Promise<Lead | null> {
		const result = await this.db
			.select()
			.from(leads)
			.where(eq(leads.id, id))
			.limit(1);
		return result[0] ?? null;
	}

	async findByPhone(phone: string): Promise<Lead | null> {
		const result = await this.db
			.select()
			.from(leads)
			.where(eq(leads.phone, phone))
			.orderBy(desc(leads.createdAt))
			.limit(1);
		return result[0] ?? null;
	}

	async list(query: ListLeadsQuery): Promise<{ items: Lead[]; total: number }> {
		const offset = (query.page - 1) * query.limit;

		// Build where conditions
		const conditions = [];

		if (query.status) {
			conditions.push(eq(leads.status, query.status));
		}

		if (query.source) {
			conditions.push(eq(leads.source, query.source));
		}

		if (query.priority) {
			conditions.push(eq(leads.priority, query.priority));
		}

		if (query.assignedTo) {
			conditions.push(eq(leads.assignedTo, query.assignedTo));
		}

		if (query.followUpDue) {
			// Leads with follow-up date <= today and not yet converted
			const today = new Date().toISOString().split('T')[0];
			conditions.push(
				and(
					isNotNull(leads.followUpDate),
					lte(leads.followUpDate, today),
					eq(leads.status, 'New') || eq(leads.status, 'Contacted') || eq(leads.status, 'Negotiating')
				)
			);
		}

		if (query.search) {
			const searchPattern = `%${query.search}%`;
			conditions.push(
				or(
					like(leads.name, searchPattern),
					like(leads.phone, searchPattern),
					like(leads.email, searchPattern)
				)
			);
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		// Get items
		const items = await this.db
			.select()
			.from(leads)
			.where(whereClause)
			.orderBy(desc(leads.createdAt))
			.limit(query.limit)
			.offset(offset);

		// Get total count
		const countResult = await this.db
			.select({ id: leads.id })
			.from(leads)
			.where(whereClause);

		const total = countResult.length;

		return { items, total };
	}

	async create(data: Omit<NewLead, 'id'>): Promise<Lead> {
		const id = crypto.randomUUID();
		await this.db.insert(leads).values({ id, ...data });
		const lead = await this.findById(id);
		if (!lead) {
			throw new Error('Failed to create lead');
		}
		return lead;
	}

	async update(id: string, data: Partial<Omit<NewLead, 'id' | 'createdAt'>>): Promise<Lead | null> {
		await this.db
			.update(leads)
			.set({ ...data, updatedAt: new Date().toISOString() })
			.where(eq(leads.id, id));
		return this.findById(id);
	}

	async updateStatus(id: string, status: Lead['status']): Promise<Lead | null> {
		const updateData: Partial<NewLead> = { status };

		if (status === 'Converted') {
			updateData.convertedAt = new Date().toISOString();
		}

		return this.update(id, updateData);
	}

	async appendNote(id: string, note: string, existingNotes: string | null): Promise<Lead | null> {
		const timestamp = new Date().toISOString();
		const newNoteEntry = `[${timestamp}] ${note}`;
		const updatedNotes = existingNotes
			? `${existingNotes}\n${newNoteEntry}`
			: newNoteEntry;

		return this.update(id, { notes: updatedNotes });
	}

	// Stats queries
	async getStats(): Promise<{
		total: number;
		byStatus: Record<string, number>;
		bySource: Record<string, { count: number; converted: number }>;
		byPriority: Record<string, number>;
		followUpsDue: number;
	}> {
		const allLeads = await this.db.select().from(leads);

		const byStatus: Record<string, number> = {
			New: 0,
			Contacted: 0,
			Negotiating: 0,
			Converted: 0,
			Lost: 0,
		};

		const bySource: Record<string, { count: number; converted: number }> = {};
		const byPriority: Record<string, number> = {
			Hot: 0,
			Warm: 0,
			Cold: 0,
		};

		const today = new Date().toISOString().split('T')[0];
		let followUpsDue = 0;

		for (const lead of allLeads) {
			// By status
			byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;

			// By source
			if (!bySource[lead.source]) {
				bySource[lead.source] = { count: 0, converted: 0 };
			}
			bySource[lead.source].count++;
			if (lead.status === 'Converted') {
				bySource[lead.source].converted++;
			}

			// By priority
			byPriority[lead.priority] = (byPriority[lead.priority] || 0) + 1;

			// Follow-ups due
			if (
				lead.followUpDate &&
				lead.followUpDate <= today &&
				['New', 'Contacted', 'Negotiating'].includes(lead.status)
			) {
				followUpsDue++;
			}
		}

		return {
			total: allLeads.length,
			byStatus,
			bySource,
			byPriority,
			followUpsDue,
		};
	}
}
