import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { validateBody, validateQuery, getValidatedBody, getValidatedQuery } from '@/worker/core/middleware/validator';
import {
	createLeadSchema,
	updateLeadSchema,
	updateLeadStatusSchema,
	addNoteSchema,
	listLeadsQuerySchema,
} from '@/worker/modules/leads/leads.dto';
import { NotFoundError, ValidationError, AppError } from '@/worker/core/types/errors';
import type {
	ListLeadsQuery,
	CreateLeadRequest,
	UpdateLeadRequest,
	UpdateLeadStatusRequest,
	AddNoteRequest,
} from '@/worker/modules/leads/leads.dto';

/**
 * Integration tests for Leads module
 * Tests the HTTP layer and middleware integration
 */
describe('Leads Integration Tests', () => {
	let app: Hono<{ Bindings: Env }>;

	beforeEach(() => {
		vi.clearAllMocks();
		app = new Hono<{ Bindings: Env }>();

		// Custom error handler for tests
		app.onError((error, c) => {
			if (error instanceof AppError) {
				return c.json({
					error: {
						message: error.message,
						code: error.code,
					},
				}, error.statusCode);
			}
			return c.json({
				error: {
					message: error.message || 'Internal server error',
					code: 'INTERNAL_ERROR',
				},
			}, 500);
		});
	});

	describe('Validation Middleware Integration', () => {
		describe('Create Lead Validation', () => {
			beforeEach(() => {
				app.use('/leads', validateBody(createLeadSchema));
				app.post('/leads', (c) => {
					const body = getValidatedBody(c) as CreateLeadRequest;
					return c.json({ success: true, data: body });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept valid lead data', async () => {
				const res = await app.request('/leads', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'John Doe',
						phone: '+6281234567890',
						source: 'WhatsApp',
					}),
				});

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: CreateLeadRequest };
				expect(body.success).toBe(true);
				expect(body.data.name).toBe('John Doe');
				expect(body.data.source).toBe('WhatsApp');
			});

			it('[P0] should reject missing name', async () => {
				const res = await app.request('/leads', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						phone: '+6281234567890',
						source: 'WhatsApp',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P0] should reject missing phone', async () => {
				const res = await app.request('/leads', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'John Doe',
						source: 'WhatsApp',
					}),
				});

				expect(res.status).toBe(400);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should default source to Website', async () => {
				const res = await app.request('/leads', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'John Doe',
						phone: '+6281234567890',
					}),
				});

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: CreateLeadRequest };
				expect(body.data.source).toBe('Website');
			});

			it('[P1] should default priority to Warm', async () => {
				const res = await app.request('/leads', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'John Doe',
						phone: '+6281234567890',
					}),
				});

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: CreateLeadRequest };
				expect(body.data.priority).toBe('Warm');
			});

			it('[P1] should accept all valid sources', async () => {
				const sources = ['WhatsApp', 'Instagram', 'Facebook', 'TikTok', 'Website', 'WalkIn'];

				for (const source of sources) {
					const res = await app.request('/leads', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							name: 'John Doe',
							phone: '+6281234567890',
							source,
						}),
					});

					expect(res.status).toBe(200);
				}
			});

			it('[P1] should reject invalid source', async () => {
				const res = await app.request('/leads', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'John Doe',
						phone: '+6281234567890',
						source: 'InvalidSource',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should accept all valid priorities', async () => {
				const priorities = ['Hot', 'Warm', 'Cold'];

				for (const priority of priorities) {
					const res = await app.request('/leads', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							name: 'John Doe',
							phone: '+6281234567890',
							priority,
						}),
					});

					expect(res.status).toBe(200);
				}
			});

			it('[P1] should accept valid followUpDate', async () => {
				const res = await app.request('/leads', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'John Doe',
						phone: '+6281234567890',
						followUpDate: '2026-03-05',
					}),
				});

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: CreateLeadRequest };
				expect(body.data.followUpDate).toBe('2026-03-05');
			});

			it('[P1] should reject invalid followUpDate format', async () => {
				const res = await app.request('/leads', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'John Doe',
						phone: '+6281234567890',
						followUpDate: '03/05/2026',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should accept optional email', async () => {
				const res = await app.request('/leads', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'John Doe',
						phone: '+6281234567890',
						email: 'john@example.com',
					}),
				});

				expect(res.status).toBe(200);
			});

			it('[P1] should reject invalid email', async () => {
				const res = await app.request('/leads', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'John Doe',
						phone: '+6281234567890',
						email: 'invalid-email',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should accept notes', async () => {
				const res = await app.request('/leads', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'John Doe',
						phone: '+6281234567890',
						notes: 'Interested in trail bike rental',
					}),
				});

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: CreateLeadRequest };
				expect(body.data.notes).toBe('Interested in trail bike rental');
			});
		});

		describe('Update Lead Validation', () => {
			beforeEach(() => {
				app.use('/leads/:id', validateBody(updateLeadSchema));
				app.patch('/leads/:id', (c) => {
					const body = getValidatedBody(c) as UpdateLeadRequest;
					return c.json({ success: true, data: body });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept valid update data', async () => {
				const res = await app.request('/leads/lead-123', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Updated Name',
					}),
				});

				expect(res.status).toBe(200);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should accept empty body', async () => {
				const res = await app.request('/leads/lead-123', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				});

				expect(res.status).toBe(200);
			});

			it('[P1] should accept priority update', async () => {
				const res = await app.request('/leads/lead-123', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						priority: 'Hot',
					}),
				});

				expect(res.status).toBe(200);
			});

			it('[P1] should accept assignedTo update', async () => {
				const res = await app.request('/leads/lead-123', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						assignedTo: 'user-1',
					}),
				});

				expect(res.status).toBe(200);
			});

			it('[P1] should accept followUpDate update', async () => {
				const res = await app.request('/leads/lead-123', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						followUpDate: '2026-03-10',
					}),
				});

				expect(res.status).toBe(200);
			});
		});

		describe('Update Lead Status Validation', () => {
			beforeEach(() => {
				app.use('/leads/:id/status', validateBody(updateLeadStatusSchema));
				app.patch('/leads/:id/status', (c) => {
					const body = getValidatedBody(c) as UpdateLeadStatusRequest;
					return c.json({ success: true, data: body });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept valid status update', async () => {
				const res = await app.request('/leads/lead-123/status', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						status: 'Contacted',
					}),
				});

				expect(res.status).toBe(200);
			});

			it('[P0] should reject invalid status', async () => {
				const res = await app.request('/leads/lead-123/status', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						status: 'InvalidStatus',
					}),
				});

				expect(res.status).toBe(400);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should accept all valid statuses', async () => {
				const statuses = ['New', 'Contacted', 'Negotiating', 'Converted', 'Lost'];

				for (const status of statuses) {
					const res = await app.request('/leads/lead-123/status', {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ status }),
					});

					expect(res.status).toBe(200);
				}
			});

			it('[P1] should accept optional notes', async () => {
				const res = await app.request('/leads/lead-123/status', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						status: 'Lost',
						notes: 'Price too high',
					}),
				});

				expect(res.status).toBe(200);
			});
		});

		describe('Add Note Validation', () => {
			beforeEach(() => {
				app.use('/leads/:id/notes', validateBody(addNoteSchema));
				app.post('/leads/:id/notes', (c) => {
					const body = getValidatedBody(c) as AddNoteRequest;
					return c.json({ success: true, data: body });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept valid note', async () => {
				const res = await app.request('/leads/lead-123/notes', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						note: 'Customer confirmed dates',
					}),
				});

				expect(res.status).toBe(200);
			});

			it('[P0] should reject empty note', async () => {
				const res = await app.request('/leads/lead-123/notes', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						note: '',
					}),
				});

				expect(res.status).toBe(400);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should reject missing note', async () => {
				const res = await app.request('/leads/lead-123/notes', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should accept note at max length', async () => {
				const res = await app.request('/leads/lead-123/notes', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						note: 'A'.repeat(1000),
					}),
				});

				expect(res.status).toBe(200);
			});

			it('[P1] should reject note exceeding max length', async () => {
				const res = await app.request('/leads/lead-123/notes', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						note: 'A'.repeat(1001),
					}),
				});

				expect(res.status).toBe(400);
			});
		});

		describe('List Query Validation', () => {
			beforeEach(() => {
				app.use('/leads', validateQuery(listLeadsQuerySchema));
				app.get('/leads', (c) => {
					const query = getValidatedQuery(c) as ListLeadsQuery;
					return c.json({ success: true, data: query });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should apply default values', async () => {
				const res = await app.request('/leads');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListLeadsQuery };
				expect(body.data.page).toBe(1);
				expect(body.data.limit).toBe(25);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should accept status filter', async () => {
				const res = await app.request('/leads?status=New');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListLeadsQuery };
				expect(body.data.status).toBe('New');
			});

			it('[P1] should accept source filter', async () => {
				const res = await app.request('/leads?source=WhatsApp');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListLeadsQuery };
				expect(body.data.source).toBe('WhatsApp');
			});

			it('[P1] should accept priority filter', async () => {
				const res = await app.request('/leads?priority=Hot');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListLeadsQuery };
				expect(body.data.priority).toBe('Hot');
			});

			it('[P1] should accept assignedTo filter', async () => {
				const res = await app.request('/leads?assignedTo=user-1');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListLeadsQuery };
				expect(body.data.assignedTo).toBe('user-1');
			});

			it('[P1] should accept search parameter', async () => {
				const res = await app.request('/leads?search=john');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListLeadsQuery };
				expect(body.data.search).toBe('john');
			});

			it('[P1] should accept followUpDue filter', async () => {
				const res = await app.request('/leads?followUpDue=true');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListLeadsQuery };
				expect(body.data.followUpDue).toBe(true);
			});

			it('[P1] should reject invalid status', async () => {
				const res = await app.request('/leads?status=Invalid');

				expect(res.status).toBe(400);
			});

			it('[P1] should reject limit exceeding max', async () => {
				const res = await app.request('/leads?limit=101');

				expect(res.status).toBe(400);
			});

			it('[P1] should accept combined filters', async () => {
				const res = await app.request('/leads?status=New&priority=Hot&source=WhatsApp');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListLeadsQuery };
				expect(body.data.status).toBe('New');
				expect(body.data.priority).toBe('Hot');
				expect(body.data.source).toBe('WhatsApp');
			});
		});
	});

	describe('Error Handling Integration', () => {
		beforeEach(() => {
			app.get('/error/not-found', () => {
				throw new NotFoundError('Lead');
			});
			app.get('/error/validation', () => {
				throw new ValidationError('Cannot update converted leads');
			});
		});

		// ============================================
		// P0: Error Response Format
		// ============================================

		it('[P0] should return 404 for NotFoundError', async () => {
			const res = await app.request('/error/not-found');

			expect(res.status).toBe(404);
			const body = await res.json() as { error: { message: string; code: string } };
			expect(body.error.code).toBe('NOT_FOUND');
			expect(body.error.message).toBe('Lead not found');
		});

		it('[P0] should return 400 for ValidationError', async () => {
			const res = await app.request('/error/validation');

			expect(res.status).toBe(400);
			const body = await res.json() as { error: { message: string; code: string } };
			expect(body.error.code).toBe('VALIDATION_ERROR');
			expect(body.error.message).toContain('Cannot update converted leads');
		});
	});

	describe('Response Format Integration', () => {
		beforeEach(() => {
			// Register more specific routes first to avoid :id matching
			app.get('/leads/statistics', (c) => {
				return c.json({
					success: true,
					data: {
						total: 100,
						byStatus: {
							New: 20,
							Contacted: 30,
							Negotiating: 25,
							Converted: 20,
							Lost: 5,
						},
						bySource: [
							{ source: 'WhatsApp', count: 40, converted: 10 },
						],
						byPriority: { Hot: 30, Warm: 50, Cold: 20 },
						conversionRate: 20,
						followUpsDue: 15,
					},
				});
			});

			app.get('/leads/:id', (c) => {
				return c.json({
					success: true,
					data: {
						id: c.req.param('id'),
						name: 'John Doe',
						phone: '+6281234567890',
						source: 'WhatsApp',
						status: 'New',
						priority: 'Hot',
						assignedTo: null,
						followUpDate: '2026-03-05',
						createdAt: new Date().toISOString(),
					},
				});
			});

			app.get('/leads', (c) => {
				return c.json({
					success: true,
					data: {
						items: [
							{ id: '1', name: 'John Doe', status: 'New' },
							{ id: '2', name: 'Jane Smith', status: 'Contacted' },
						],
						meta: { page: 1, limit: 25, total: 2, totalPages: 1 },
					},
				});
			});
		});

		// ============================================
		// P0: Response Format Tests
		// ============================================

		it('[P0] should return success response format for single lead', async () => {
			const res = await app.request('/leads/lead-123');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { id: string } };
			expect(body.success).toBe(true);
			expect(body.data).toBeDefined();
		});

		it('[P0] should return paginated response format for lead list', async () => {
			const res = await app.request('/leads');

			expect(res.status).toBe(200);
			const body = await res.json() as {
				success: boolean;
				data: { items: unknown[]; meta: { page: number; limit: number; total: number; totalPages: number } };
			};
			expect(body.success).toBe(true);
			expect(body.data.items).toHaveLength(2);
			expect(body.data.meta.total).toBe(2);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should return statistics response format', async () => {
			const res = await app.request('/leads/statistics');

			expect(res.status).toBe(200);
			const body = await res.json() as {
				success: boolean;
				data: {
					total: number;
					byStatus: Record<string, number>;
					bySource: unknown[];
					conversionRate: number;
					followUpsDue: number;
				};
			};
			expect(body.success).toBe(true);
			expect(body.data.total).toBe(100);
			expect(body.data.conversionRate).toBe(20);
			expect(body.data.followUpsDue).toBe(15);
		});
	});
});
