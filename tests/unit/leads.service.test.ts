import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeadsService } from '@/worker/modules/leads/leads.service';
import { LeadsRepository } from '@/worker/modules/leads/leads.repository';
import { NotFoundError, ValidationError } from '@/worker/core/types/errors';
import { createTestLead } from '@test/utils';

describe('LeadsService', () => {
	let leadsService: LeadsService;
	let mockLeadRepo: LeadsRepository;

	beforeEach(() => {
		// Create mock repository
		mockLeadRepo = {
			findById: vi.fn(),
			findByPhone: vi.fn(),
			list: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			updateStatus: vi.fn(),
			appendNote: vi.fn(),
			getStats: vi.fn(),
		} as unknown as LeadsRepository;

		leadsService = new LeadsService(mockLeadRepo);
	});

	describe('list', () => {
		// ============================================
		// P0: Happy Path - Critical business scenarios
		// ============================================

		it('[P0] should list leads with pagination', async () => {
			const mockLeads = [
				createTestLead({ name: 'John Doe' }),
				createTestLead({ name: 'Jane Smith' }),
			];

			vi.mocked(mockLeadRepo.list).mockResolvedValue({
				items: mockLeads,
				total: 2,
			});

			const result = await leadsService.list({ page: 1, limit: 25 });

			expect(result.items).toHaveLength(2);
			expect(result.meta.page).toBe(1);
			expect(result.meta.limit).toBe(25);
			expect(result.meta.total).toBe(2);
			expect(result.meta.totalPages).toBe(1);
		});

		it('[P0] should filter by status', async () => {
			const newLead = createTestLead({ status: 'New' });
			vi.mocked(mockLeadRepo.list).mockResolvedValue({
				items: [newLead],
				total: 1,
			});

			const result = await leadsService.list({ page: 1, limit: 25, status: 'New' });

			expect(mockLeadRepo.list).toHaveBeenCalledWith({
				page: 1,
				limit: 25,
				status: 'New',
			});
			expect(result.items[0].status).toBe('New');
		});

		it('[P0] should filter by source', async () => {
			const whatsappLead = createTestLead({ source: 'WhatsApp' });
			vi.mocked(mockLeadRepo.list).mockResolvedValue({
				items: [whatsappLead],
				total: 1,
			});

			await leadsService.list({ page: 1, limit: 25, source: 'WhatsApp' });

			expect(mockLeadRepo.list).toHaveBeenCalledWith({
				page: 1,
				limit: 25,
				source: 'WhatsApp',
			});
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should handle empty result set', async () => {
			vi.mocked(mockLeadRepo.list).mockResolvedValue({
				items: [],
				total: 0,
			});

			const result = await leadsService.list({ page: 1, limit: 25 });

			expect(result.items).toHaveLength(0);
			expect(result.meta.totalPages).toBe(0);
		});

		it('[P1] should filter by priority', async () => {
			const hotLead = createTestLead({ priority: 'Hot' });
			vi.mocked(mockLeadRepo.list).mockResolvedValue({
				items: [hotLead],
				total: 1,
			});

			await leadsService.list({ page: 1, limit: 25, priority: 'Hot' });

			expect(mockLeadRepo.list).toHaveBeenCalledWith(
				expect.objectContaining({ priority: 'Hot' })
			);
		});

		it('[P1] should filter by assigned user', async () => {
			vi.mocked(mockLeadRepo.list).mockResolvedValue({
				items: [],
				total: 0,
			});

			await leadsService.list({ page: 1, limit: 25, assignedTo: 'user-1' });

			expect(mockLeadRepo.list).toHaveBeenCalledWith(
				expect.objectContaining({ assignedTo: 'user-1' })
			);
		});

		it('[P1] should filter by follow-up due', async () => {
			vi.mocked(mockLeadRepo.list).mockResolvedValue({
				items: [],
				total: 0,
			});

			await leadsService.list({ page: 1, limit: 25, followUpDue: true });

			expect(mockLeadRepo.list).toHaveBeenCalledWith(
				expect.objectContaining({ followUpDue: true })
			);
		});

		it('[P1] should include assigned user details in response', async () => {
			const leadWithAssignment = createTestLead({ assignedTo: 'user-1' });
			vi.mocked(mockLeadRepo.list).mockResolvedValue({
				items: [leadWithAssignment],
				total: 1,
			});

			const result = await leadsService.list({ page: 1, limit: 25 });

			expect(result.items[0].assignedToUser).toEqual({
				id: 'user-1',
				name: 'Unknown', // Placeholder until user service integration
			});
		});
	});

	describe('getById', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return lead with details', async () => {
			const mockLead = createTestLead();
			vi.mocked(mockLeadRepo.findById).mockResolvedValue(mockLead);

			const result = await leadsService.getById(mockLead.id);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(mockLead.id);
			expect(result?.name).toBe(mockLead.name);
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should return null when lead not found', async () => {
			vi.mocked(mockLeadRepo.findById).mockResolvedValue(null);

			const result = await leadsService.getById('nonexistent-id');

			expect(result).toBeNull();
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should return lead with all sources', async () => {
			const sources: Array<'WhatsApp' | 'Instagram' | 'Facebook' | 'TikTok' | 'Website' | 'WalkIn'> =
				['WhatsApp', 'Instagram', 'Facebook', 'TikTok', 'Website', 'WalkIn'];

			for (const source of sources) {
				const mockLead = createTestLead({ source });
				vi.mocked(mockLeadRepo.findById).mockResolvedValue(mockLead);

				const result = await leadsService.getById(mockLead.id);

				expect(result?.source).toBe(source);
			}
		});

		it('[P1] should return lead with all statuses', async () => {
			const statuses: Array<'New' | 'Contacted' | 'Negotiating' | 'Converted' | 'Lost'> =
				['New', 'Contacted', 'Negotiating', 'Converted', 'Lost'];

			for (const status of statuses) {
				const mockLead = createTestLead({ status });
				vi.mocked(mockLeadRepo.findById).mockResolvedValue(mockLead);

				const result = await leadsService.getById(mockLead.id);

				expect(result?.status).toBe(status);
			}
		});

		it('[P1] should return lead with all priorities', async () => {
			const priorities: Array<'Hot' | 'Warm' | 'Cold'> = ['Hot', 'Warm', 'Cold'];

			for (const priority of priorities) {
				const mockLead = createTestLead({ priority });
				vi.mocked(mockLeadRepo.findById).mockResolvedValue(mockLead);

				const result = await leadsService.getById(mockLead.id);

				expect(result?.priority).toBe(priority);
			}
		});

		it('[P1] should return converted lead with convertedAt date', async () => {
			const convertedLead = createTestLead({
				status: 'Converted',
				convertedAt: '2026-03-01T10:00:00Z',
			});
			vi.mocked(mockLeadRepo.findById).mockResolvedValue(convertedLead);

			const result = await leadsService.getById(convertedLead.id);

			expect(result?.status).toBe('Converted');
			expect(result?.convertedAt).toBe('2026-03-01T10:00:00Z');
		});
	});

	describe('create', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should create lead with valid data', async () => {
			const newLead = createTestLead({
				name: 'Test Lead',
				phone: '+6281234567890',
				source: 'WhatsApp',
			});
			vi.mocked(mockLeadRepo.create).mockResolvedValue(newLead);

			const result = await leadsService.create({
				name: 'Test Lead',
				phone: '+6281234567890',
				source: 'WhatsApp',
			});

			expect(result.name).toBe('Test Lead');
			expect(result.phone).toBe('+6281234567890');
			expect(result.source).toBe('WhatsApp');
			expect(mockLeadRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Test Lead',
					phone: '+6281234567890',
					source: 'WhatsApp',
					status: 'New',
				})
			);
		});

		it('[P0] should create lead with all optional fields', async () => {
			const newLead = createTestLead({
				email: 'test@example.com',
				notes: 'Initial inquiry',
				priority: 'Hot',
				assignedTo: 'user-1',
				followUpDate: '2026-03-05',
			});
			vi.mocked(mockLeadRepo.create).mockResolvedValue(newLead);

			const result = await leadsService.create({
				name: 'Test Lead',
				phone: '+6281234567890',
				source: 'WhatsApp',
				email: 'test@example.com',
				notes: 'Initial inquiry',
				priority: 'Hot',
				assignedTo: 'user-1',
				followUpDate: '2026-03-05',
			});

			expect(result.email).toBe('test@example.com');
			expect(result.priority).toBe('Hot');
			expect(result.assignedTo).toBe('user-1');
			expect(result.followUpDate).toBe('2026-03-05');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should default status to New', async () => {
			const newLead = createTestLead();
			vi.mocked(mockLeadRepo.create).mockResolvedValue(newLead);

			await leadsService.create({
				name: 'Test Lead',
				phone: '+6281234567890',
				source: 'Website',
			});

			expect(mockLeadRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'New',
				})
			);
		});

		it('[P1] should pass priority from request (defaults applied by validation layer)', async () => {
			const newLead = createTestLead({ priority: 'Warm' });
			vi.mocked(mockLeadRepo.create).mockResolvedValue(newLead);

			// Note: In actual API flow, Zod validation middleware applies default 'Warm'
			// Here we test that service correctly passes the priority from request
			await leadsService.create({
				name: 'Test Lead',
				phone: '+6281234567890',
				source: 'Website',
				priority: 'Warm', // Explicitly provided (as would be after validation)
			});

			expect(mockLeadRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					priority: 'Warm',
				})
			);
		});

		it('[P1] should handle all lead sources', async () => {
			const sources: Array<'WhatsApp' | 'Instagram' | 'Facebook' | 'TikTok' | 'Website' | 'WalkIn'> =
				['WhatsApp', 'Instagram', 'Facebook', 'TikTok', 'Website', 'WalkIn'];

			for (const source of sources) {
				const newLead = createTestLead({ source });
				vi.mocked(mockLeadRepo.create).mockResolvedValue(newLead);

				const result = await leadsService.create({
					name: 'Test Lead',
					phone: '+6281234567890',
					source,
				});

				expect(result.source).toBe(source);
			}
		});
	});

	describe('update', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should update lead successfully', async () => {
			const existingLead = createTestLead({ status: 'New' });
			const updatedLead = { ...existingLead, name: 'Updated Name' };

			vi.mocked(mockLeadRepo.findById).mockResolvedValue(existingLead);
			vi.mocked(mockLeadRepo.update).mockResolvedValue(updatedLead);

			const result = await leadsService.update(existingLead.id, {
				name: 'Updated Name',
			});

			expect(result.name).toBe('Updated Name');
		});

		it('[P0] should update lead priority', async () => {
			const existingLead = createTestLead({ status: 'New', priority: 'Warm' });
			const updatedLead = { ...existingLead, priority: 'Hot' };

			vi.mocked(mockLeadRepo.findById).mockResolvedValue(existingLead);
			vi.mocked(mockLeadRepo.update).mockResolvedValue(updatedLead);

			const result = await leadsService.update(existingLead.id, {
				priority: 'Hot',
			});

			expect(result.priority).toBe('Hot');
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when lead not found', async () => {
			vi.mocked(mockLeadRepo.findById).mockResolvedValue(null);

			await expect(
				leadsService.update('nonexistent-id', { name: 'New Name' })
			).rejects.toThrow(NotFoundError);
		});

		it('[P0] should throw ValidationError when updating converted lead', async () => {
			const convertedLead = createTestLead({ status: 'Converted' });
			vi.mocked(mockLeadRepo.findById).mockResolvedValue(convertedLead);

			await expect(
				leadsService.update(convertedLead.id, { name: 'New Name' })
			).rejects.toThrow(ValidationError);

			await expect(
				leadsService.update(convertedLead.id, { name: 'New Name' })
			).rejects.toThrow('Cannot update converted leads');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should update follow-up date', async () => {
			const existingLead = createTestLead({ status: 'New' });
			const updatedLead = { ...existingLead, followUpDate: '2026-03-10' };

			vi.mocked(mockLeadRepo.findById).mockResolvedValue(existingLead);
			vi.mocked(mockLeadRepo.update).mockResolvedValue(updatedLead);

			const result = await leadsService.update(existingLead.id, {
				followUpDate: '2026-03-10',
			});

			expect(result.followUpDate).toBe('2026-03-10');
		});

		it('[P1] should allow updating lead in Negotiating status', async () => {
			const negotiatingLead = createTestLead({ status: 'Negotiating' });
			const updatedLead = { ...negotiatingLead, priority: 'Hot' };

			vi.mocked(mockLeadRepo.findById).mockResolvedValue(negotiatingLead);
			vi.mocked(mockLeadRepo.update).mockResolvedValue(updatedLead);

			const result = await leadsService.update(negotiatingLead.id, {
				priority: 'Hot',
			});

			expect(result.priority).toBe('Hot');
		});
	});

	describe('updateStatus', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should update lead status from New to Contacted', async () => {
			const existingLead = createTestLead({ status: 'New' });
			const updatedLead = { ...existingLead, status: 'Contacted' };

			vi.mocked(mockLeadRepo.findById).mockResolvedValue(existingLead);
			vi.mocked(mockLeadRepo.updateStatus).mockResolvedValue(updatedLead);

			const result = await leadsService.updateStatus(existingLead.id, {
				status: 'Contacted',
			});

			expect(result.status).toBe('Contacted');
			expect(mockLeadRepo.updateStatus).toHaveBeenCalledWith(existingLead.id, 'Contacted');
		});

		it('[P0] should update status to Converted', async () => {
			const existingLead = createTestLead({ status: 'Negotiating' });
			const convertedLead = {
				...existingLead,
				status: 'Converted' as const,
				convertedAt: new Date().toISOString(),
			};

			vi.mocked(mockLeadRepo.findById).mockResolvedValue(existingLead);
			vi.mocked(mockLeadRepo.updateStatus).mockResolvedValue(convertedLead);

			const result = await leadsService.updateStatus(existingLead.id, {
				status: 'Converted',
			});

			expect(result.status).toBe('Converted');
			expect(mockLeadRepo.updateStatus).toHaveBeenCalledWith(existingLead.id, 'Converted');
		});

		it('[P0] should append notes when status changes', async () => {
			const existingLead = createTestLead({ status: 'New' });
			const updatedLead = { ...existingLead, status: 'Lost' };

			vi.mocked(mockLeadRepo.findById).mockResolvedValue(existingLead);
			vi.mocked(mockLeadRepo.updateStatus).mockResolvedValue(updatedLead);
			vi.mocked(mockLeadRepo.appendNote).mockResolvedValue({
				...updatedLead,
				notes: '[2026-03-01] Price too high',
			});

			const result = await leadsService.updateStatus(existingLead.id, {
				status: 'Lost',
				notes: 'Price too high',
			});

			expect(mockLeadRepo.appendNote).toHaveBeenCalled();
			expect(result).toBeDefined();
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when lead not found', async () => {
			vi.mocked(mockLeadRepo.findById).mockResolvedValue(null);

			await expect(
				leadsService.updateStatus('nonexistent-id', { status: 'Contacted' })
			).rejects.toThrow(NotFoundError);
		});

		it('[P0] should throw ValidationError when changing status of converted lead', async () => {
			const convertedLead = createTestLead({ status: 'Converted' });
			vi.mocked(mockLeadRepo.findById).mockResolvedValue(convertedLead);

			await expect(
				leadsService.updateStatus(convertedLead.id, { status: 'Lost' })
			).rejects.toThrow(ValidationError);

			await expect(
				leadsService.updateStatus(convertedLead.id, { status: 'Lost' })
			).rejects.toThrow('Cannot change status of converted leads');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should allow updating converted lead to Converted (idempotent)', async () => {
			const convertedLead = createTestLead({ status: 'Converted' });
			vi.mocked(mockLeadRepo.findById).mockResolvedValue(convertedLead);
			vi.mocked(mockLeadRepo.updateStatus).mockResolvedValue(convertedLead);

			const result = await leadsService.updateStatus(convertedLead.id, {
				status: 'Converted',
			});

			expect(result.status).toBe('Converted');
		});

		it('[P1] should update status to Lost', async () => {
			const existingLead = createTestLead({ status: 'Negotiating' });
			const lostLead = { ...existingLead, status: 'Lost' as const };

			vi.mocked(mockLeadRepo.findById).mockResolvedValue(existingLead);
			vi.mocked(mockLeadRepo.updateStatus).mockResolvedValue(lostLead);

			const result = await leadsService.updateStatus(existingLead.id, {
				status: 'Lost',
			});

			expect(result.status).toBe('Lost');
		});
	});

	describe('addNote', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should add note to lead', async () => {
			const existingLead = createTestLead();
			const updatedLead = { ...existingLead, notes: '[2026-03-01] New note' };

			vi.mocked(mockLeadRepo.findById).mockResolvedValue(existingLead);
			vi.mocked(mockLeadRepo.appendNote).mockResolvedValue(updatedLead);

			const result = await leadsService.addNote(existingLead.id, {
				note: 'New note',
			});

			expect(mockLeadRepo.appendNote).toHaveBeenCalledWith(
				existingLead.id,
				'New note',
				existingLead.notes
			);
			expect(result).toBeDefined();
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when lead not found', async () => {
			vi.mocked(mockLeadRepo.findById).mockResolvedValue(null);

			await expect(
				leadsService.addNote('nonexistent-id', { note: 'Test note' })
			).rejects.toThrow(NotFoundError);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should allow adding note to converted lead', async () => {
			const convertedLead = createTestLead({ status: 'Converted' });
			const updatedLead = {
				...convertedLead,
				notes: '[2026-03-01] Follow-up note',
			};

			vi.mocked(mockLeadRepo.findById).mockResolvedValue(convertedLead);
			vi.mocked(mockLeadRepo.appendNote).mockResolvedValue(updatedLead);

			const result = await leadsService.addNote(convertedLead.id, {
				note: 'Follow-up note',
			});

			expect(mockLeadRepo.appendNote).toHaveBeenCalled();
			expect(result).toBeDefined();
		});

		it('[P1] should append note to existing notes', async () => {
			const existingLead = createTestLead({
				notes: '[2026-02-28] First note',
			});
			const updatedLead = {
				...existingLead,
				notes: '[2026-02-28] First note\n[2026-03-01] Second note',
			};

			vi.mocked(mockLeadRepo.findById).mockResolvedValue(existingLead);
			vi.mocked(mockLeadRepo.appendNote).mockResolvedValue(updatedLead);

			await leadsService.addNote(existingLead.id, {
				note: 'Second note',
			});

			expect(mockLeadRepo.appendNote).toHaveBeenCalledWith(
				existingLead.id,
				'Second note',
				'[2026-02-28] First note'
			);
		});
	});

	describe('assignToUser', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should assign lead to user', async () => {
			const existingLead = createTestLead({ assignedTo: null });
			const assignedLead = { ...existingLead, assignedTo: 'user-1' };

			vi.mocked(mockLeadRepo.findById).mockResolvedValue(existingLead);
			vi.mocked(mockLeadRepo.update).mockResolvedValue(assignedLead);

			const result = await leadsService.assignToUser(existingLead.id, 'user-1');

			expect(result.assignedTo).toBe('user-1');
		});

		it('[P0] should unassign lead from user', async () => {
			const assignedLead = createTestLead({ assignedTo: 'user-1' });
			const unassignedLead = { ...assignedLead, assignedTo: null };

			vi.mocked(mockLeadRepo.findById).mockResolvedValue(assignedLead);
			vi.mocked(mockLeadRepo.update).mockResolvedValue(unassignedLead);

			const result = await leadsService.assignToUser(assignedLead.id, null);

			expect(result.assignedTo).toBeNull();
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when lead not found', async () => {
			vi.mocked(mockLeadRepo.findById).mockResolvedValue(null);

			await expect(
				leadsService.assignToUser('nonexistent-id', 'user-1')
			).rejects.toThrow(NotFoundError);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should reassign lead to different user', async () => {
			const existingLead = createTestLead({ assignedTo: 'user-1' });
			const reassignedLead = { ...existingLead, assignedTo: 'user-2' };

			vi.mocked(mockLeadRepo.findById).mockResolvedValue(existingLead);
			vi.mocked(mockLeadRepo.update).mockResolvedValue(reassignedLead);

			const result = await leadsService.assignToUser(existingLead.id, 'user-2');

			expect(result.assignedTo).toBe('user-2');
		});
	});

	describe('getStats', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return lead statistics', async () => {
			vi.mocked(mockLeadRepo.getStats).mockResolvedValue({
				total: 100,
				byStatus: {
					New: 20,
					Contacted: 30,
					Negotiating: 25,
					Converted: 20,
					Lost: 5,
				},
				bySource: {
					WhatsApp: { count: 40, converted: 10 },
					Instagram: { count: 30, converted: 5 },
					Website: { count: 30, converted: 5 },
				},
				byPriority: {
					Hot: 30,
					Warm: 50,
					Cold: 20,
				},
				followUpsDue: 15,
			});

			const result = await leadsService.getStats();

			expect(result.total).toBe(100);
			expect(result.conversionRate).toBe(20); // 20/100 = 20%
			expect(result.byStatus.Converted).toBe(20);
			expect(result.followUpsDue).toBe(15);
		});

		it('[P0] should calculate conversion rate correctly', async () => {
			vi.mocked(mockLeadRepo.getStats).mockResolvedValue({
				total: 50,
				byStatus: {
					New: 10,
					Contacted: 10,
					Negotiating: 10,
					Converted: 15,
					Lost: 5,
				},
				bySource: {},
				byPriority: { Hot: 0, Warm: 0, Cold: 0 },
				followUpsDue: 0,
			});

			const result = await leadsService.getStats();

			expect(result.conversionRate).toBe(30); // 15/50 = 30%
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should handle zero leads', async () => {
			vi.mocked(mockLeadRepo.getStats).mockResolvedValue({
				total: 0,
				byStatus: {
					New: 0,
					Contacted: 0,
					Negotiating: 0,
					Converted: 0,
					Lost: 0,
				},
				bySource: {},
				byPriority: { Hot: 0, Warm: 0, Cold: 0 },
				followUpsDue: 0,
			});

			const result = await leadsService.getStats();

			expect(result.total).toBe(0);
			expect(result.conversionRate).toBe(0);
		});

		it('[P1] should include source breakdown with conversion counts', async () => {
			vi.mocked(mockLeadRepo.getStats).mockResolvedValue({
				total: 100,
				byStatus: {
					New: 20,
					Contacted: 30,
					Negotiating: 25,
					Converted: 20,
					Lost: 5,
				},
				bySource: {
					WhatsApp: { count: 50, converted: 15 },
					Instagram: { count: 30, converted: 3 },
					Facebook: { count: 20, converted: 2 },
				},
				byPriority: { Hot: 30, Warm: 50, Cold: 20 },
				followUpsDue: 10,
			});

			const result = await leadsService.getStats();

			expect(result.bySource).toHaveLength(3);
			expect(result.bySource[0]).toEqual({
				source: 'WhatsApp',
				count: 50,
				converted: 15,
			});
		});

		it('[P1] should round conversion rate', async () => {
			vi.mocked(mockLeadRepo.getStats).mockResolvedValue({
				total: 33,
				byStatus: {
					New: 10,
					Contacted: 10,
					Negotiating: 10,
					Converted: 10,
					Lost: 3,
				},
				bySource: {},
				byPriority: { Hot: 0, Warm: 0, Cold: 0 },
				followUpsDue: 0,
			});

			const result = await leadsService.getStats();

			// 10/33 = 30.30..., should round to 30
			expect(result.conversionRate).toBe(30);
		});
	});

	describe('checkExists', () => {
		it('[P0] should return true when lead exists', async () => {
			vi.mocked(mockLeadRepo.findById).mockResolvedValue(createTestLead());

			const result = await leadsService.checkExists('existing-id');

			expect(result).toBe(true);
		});

		it('[P0] should return false when lead not found', async () => {
			vi.mocked(mockLeadRepo.findById).mockResolvedValue(null);

			const result = await leadsService.checkExists('nonexistent-id');

			expect(result).toBe(false);
		});
	});
});
