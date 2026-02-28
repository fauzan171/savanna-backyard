import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { validateBody, validateQuery, getValidatedBody, getValidatedQuery } from '@/worker/core/middleware/validator';
import {
	createCustomerSchema,
	updateCustomerSchema,
	setBlacklistSchema,
	listCustomersQuerySchema,
} from '@/worker/modules/customers/customers.dto';
import { ConflictError, NotFoundError, AppError } from '@/worker/core/types/errors';
import type { ListCustomersQuery, CreateCustomerRequest, UpdateCustomerRequest, SetBlacklistRequest } from '@/worker/modules/customers/customers.dto';

/**
 * Integration tests for Customers module
 * Tests the HTTP layer and middleware integration
 */
describe('Customers Integration Tests', () => {
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
		describe('Create Customer Validation', () => {
			beforeEach(() => {
				app.use('/customers', validateBody(createCustomerSchema));
				app.post('/customers', (c) => {
					const body = getValidatedBody(c) as CreateCustomerRequest;
					return c.json({ success: true, data: body });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept valid customer data', async () => {
				const res = await app.request('/customers', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'John Doe',
						phone: '+6281234567890',
						email: 'john@example.com',
					}),
				});

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: CreateCustomerRequest };
				expect(body.success).toBe(true);
				expect(body.data.name).toBe('John Doe');
			});

			it('[P0] should reject missing name', async () => {
				const res = await app.request('/customers', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						phone: '+6281234567890',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P0] should reject missing phone', async () => {
				const res = await app.request('/customers', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'John Doe',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P0] should reject invalid email format', async () => {
				const res = await app.request('/customers', {
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

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should reject name too short', async () => {
				const res = await app.request('/customers', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'J',
						phone: '+6281234567890',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should reject name too long', async () => {
				const res = await app.request('/customers', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'A'.repeat(101),
						phone: '+6281234567890',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should reject phone too short', async () => {
				const res = await app.request('/customers', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'John Doe',
						phone: '123',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should accept valid identity types', async () => {
				const identityTypes = ['KTP', 'SIM', 'Passport'];

				for (const identityType of identityTypes) {
					const res = await app.request('/customers', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							name: 'John Doe',
							phone: '+6281234567890',
							identityType,
						}),
					});

					expect(res.status).toBe(200);
				}
			});

			it('[P1] should reject invalid identity type', async () => {
				const res = await app.request('/customers', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'John Doe',
						phone: '+6281234567890',
						identityType: 'InvalidType',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should accept nullable email', async () => {
				const res = await app.request('/customers', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'John Doe',
						phone: '+6281234567890',
						email: null,
					}),
				});

				expect(res.status).toBe(200);
			});
		});

		describe('Update Customer Validation', () => {
			beforeEach(() => {
				app.use('/customers/:id', validateBody(updateCustomerSchema));
				app.patch('/customers/:id', (c) => {
					const body = getValidatedBody(c) as UpdateCustomerRequest;
					return c.json({ success: true, data: body });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept valid update data', async () => {
				const res = await app.request('/customers/cust-123', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Updated Name',
					}),
				});

				expect(res.status).toBe(200);
			});

			it('[P0] should accept empty body (all optional)', async () => {
				const res = await app.request('/customers/cust-123', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				});

				expect(res.status).toBe(200);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should reject invalid email in update', async () => {
				const res = await app.request('/customers/cust-123', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						email: 'invalid',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should reject short name in update', async () => {
				const res = await app.request('/customers/cust-123', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'X',
					}),
				});

				expect(res.status).toBe(400);
			});
		});

		describe('Set Blacklist Validation', () => {
			beforeEach(() => {
				app.use('/customers/:id/blacklist', validateBody(setBlacklistSchema));
				app.patch('/customers/:id/blacklist', (c) => {
					const body = getValidatedBody(c) as SetBlacklistRequest;
					return c.json({ success: true, data: body });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept blacklist with reason', async () => {
				const res = await app.request('/customers/cust-123/blacklist', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						isBlacklisted: true,
						reason: 'Damaged vehicle',
					}),
				});

				expect(res.status).toBe(200);
			});

			it('[P0] should reject blacklist without reason', async () => {
				const res = await app.request('/customers/cust-123/blacklist', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						isBlacklisted: true,
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P0] should accept unblacklist without reason', async () => {
				const res = await app.request('/customers/cust-123/blacklist', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						isBlacklisted: false,
					}),
				});

				expect(res.status).toBe(200);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should reject missing isBlacklisted field', async () => {
				const res = await app.request('/customers/cust-123/blacklist', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						reason: 'Some reason',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should accept empty reason when unblacklisting', async () => {
				const res = await app.request('/customers/cust-123/blacklist', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						isBlacklisted: false,
						reason: null,
					}),
				});

				expect(res.status).toBe(200);
			});
		});

		describe('List Query Validation', () => {
			beforeEach(() => {
				app.use('/customers', validateQuery(listCustomersQuerySchema));
				app.get('/customers', (c) => {
					const query = getValidatedQuery(c) as ListCustomersQuery;
					return c.json({ success: true, data: query });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept valid query parameters', async () => {
				const res = await app.request('/customers?page=1&limit=25');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListCustomersQuery };
				expect(body.data.page).toBe(1);
				expect(body.data.limit).toBe(25);
			});

			it('[P0] should apply default values', async () => {
				const res = await app.request('/customers');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListCustomersQuery };
				expect(body.data.page).toBe(1);
				expect(body.data.limit).toBe(25);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should reject limit exceeding max', async () => {
				const res = await app.request('/customers?limit=101');

				expect(res.status).toBe(400);
			});

			it('[P1] should reject invalid page number', async () => {
				const res = await app.request('/customers?page=0');

				expect(res.status).toBe(400);
			});

			it('[P1] should coerce string numbers', async () => {
				const res = await app.request('/customers?page=2&limit=50');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListCustomersQuery };
				expect(body.data.page).toBe(2);
				expect(body.data.limit).toBe(50);
			});

			it('[P1] should accept search parameter', async () => {
				const res = await app.request('/customers?search=john');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListCustomersQuery };
				expect(body.data.search).toBe('john');
			});

			it('[P1] should accept blacklist filter', async () => {
				const res = await app.request('/customers?blacklist=true');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListCustomersQuery };
				expect(body.data.blacklist).toBe(true);
			});
		});
	});

	describe('Error Handling Integration', () => {
		beforeEach(() => {
			app.get('/error/conflict', () => {
				throw new ConflictError('Email already exists');
			});
			app.get('/error/not-found', () => {
				throw new NotFoundError('Customer');
			});
		});

		// ============================================
		// P0: Error Response Format
		// ============================================

		it('[P0] should return 409 for ConflictError', async () => {
			const res = await app.request('/error/conflict');

			expect(res.status).toBe(409);
			const body = await res.json() as { error: { message: string; code: string } };
			expect(body.error.code).toBe('CONFLICT');
			expect(body.error.message).toBe('Email already exists');
		});

		it('[P0] should return 404 for NotFoundError', async () => {
			const res = await app.request('/error/not-found');

			expect(res.status).toBe(404);
			const body = await res.json() as { error: { message: string; code: string } };
			expect(body.error.code).toBe('NOT_FOUND');
			expect(body.error.message).toBe('Customer not found');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should return consistent error format', async () => {
			const res = await app.request('/error/conflict');

			const body = await res.json() as { error: unknown };
			expect(body).toHaveProperty('error');
			expect(body).not.toHaveProperty('success');
		});
	});

	describe('Response Format Integration', () => {
		beforeEach(() => {
			app.get('/customers/:id', (c) => {
				return c.json({
					success: true,
					data: {
						id: c.req.param('id'),
						name: 'John Doe',
						phone: '+6281234567890',
						email: 'john@example.com',
						isBlacklisted: false,
						createdAt: new Date().toISOString(),
					},
				});
			});

			app.get('/customers', (c) => {
				return c.json({
					success: true,
					data: {
						items: [
							{ id: '1', name: 'John Doe' },
							{ id: '2', name: 'Jane Smith' },
						],
						meta: { page: 1, limit: 25, total: 2, totalPages: 1 },
					},
				});
			});
		});

		// ============================================
		// P0: Response Format Tests
		// ============================================

		it('[P0] should return success response format for single item', async () => {
			const res = await app.request('/customers/cust-123');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { id: string } };
			expect(body.success).toBe(true);
			expect(body.data).toBeDefined();
		});

		it('[P0] should return paginated response format for list', async () => {
			const res = await app.request('/customers');

			expect(res.status).toBe(200);
			const body = await res.json() as {
				success: boolean;
				data: { items: unknown[]; meta: { page: number; limit: number; total: number; totalPages: number } };
			};
			expect(body.success).toBe(true);
			expect(body.data.items).toBeDefined();
			expect(body.data.meta).toBeDefined();
			expect(body.data.meta.page).toBe(1);
			expect(body.data.meta.total).toBe(2);
		});
	});
});
