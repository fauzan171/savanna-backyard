import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { validateBody, validateQuery, getValidatedBody, getValidatedQuery } from '@/worker/core/middleware/validator';
import {
	createMaintenanceSchema,
	updateMaintenanceSchema,
	completeMaintenanceSchema,
	listMaintenanceQuerySchema,
	vehicleHistoryQuerySchema,
	upcomingQuerySchema,
} from '@/worker/modules/maintenance/maintenance.dto';
import { ConflictError, NotFoundError, ValidationError, AppError } from '@/worker/core/types/errors';
import type {
	CreateMaintenanceRequest,
	UpdateMaintenanceRequest,
	CompleteMaintenanceRequest,
	ListMaintenanceQuery,
	VehicleHistoryQuery,
	UpcomingQuery,
} from '@/worker/modules/maintenance/maintenance.dto';

/**
 * Integration tests for Maintenance module
 * Tests the HTTP layer and middleware integration
 */
describe('Maintenance Integration Tests', () => {
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
		describe('Create Maintenance Validation', () => {
			beforeEach(() => {
				app.use('/maintenance', validateBody(createMaintenanceSchema));
				app.post('/maintenance', (c) => {
					const body = getValidatedBody(c) as CreateMaintenanceRequest;
					return c.json({ success: true, data: body });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept valid maintenance data', async () => {
				const res = await app.request('/maintenance', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						vehicleId: 'vehicle-123',
						type: 'Scheduled',
						description: 'Oil change and filter replacement',
						startDate: '2026-03-05',
					}),
				});

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: CreateMaintenanceRequest };
				expect(body.success).toBe(true);
				expect(body.data.type).toBe('Scheduled');
			});

			it('[P0] should reject missing vehicleId', async () => {
				const res = await app.request('/maintenance', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						type: 'Scheduled',
						description: 'Oil change',
						startDate: '2026-03-05',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P0] should reject missing type', async () => {
				const res = await app.request('/maintenance', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						vehicleId: 'vehicle-123',
						description: 'Oil change',
						startDate: '2026-03-05',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P0] should reject missing description', async () => {
				const res = await app.request('/maintenance', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						vehicleId: 'vehicle-123',
						type: 'Scheduled',
						startDate: '2026-03-05',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P0] should reject missing startDate', async () => {
				const res = await app.request('/maintenance', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						vehicleId: 'vehicle-123',
						type: 'Scheduled',
						description: 'Oil change',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P0] should reject invalid type', async () => {
				const res = await app.request('/maintenance', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						vehicleId: 'vehicle-123',
						type: 'InvalidType',
						description: 'Oil change',
						startDate: '2026-03-05',
					}),
				});

				expect(res.status).toBe(400);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should accept all valid maintenance types', async () => {
				const types = ['Scheduled', 'Repair', 'Damage'];

				for (const type of types) {
					const res = await app.request('/maintenance', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							vehicleId: 'vehicle-123',
							type,
							description: 'Test maintenance',
							startDate: '2026-03-05',
						}),
					});

					expect(res.status).toBe(200);
				}
			});

			it('[P1] should reject description too short', async () => {
				const res = await app.request('/maintenance', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						vehicleId: 'vehicle-123',
						type: 'Scheduled',
						description: 'abc',
						startDate: '2026-03-05',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should reject description too long', async () => {
				const res = await app.request('/maintenance', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						vehicleId: 'vehicle-123',
						type: 'Scheduled',
						description: 'a'.repeat(1001),
						startDate: '2026-03-05',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should reject invalid date format', async () => {
				const res = await app.request('/maintenance', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						vehicleId: 'vehicle-123',
						type: 'Scheduled',
						description: 'Oil change',
						startDate: '03-05-2026',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should reject negative cost', async () => {
				const res = await app.request('/maintenance', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						vehicleId: 'vehicle-123',
						type: 'Scheduled',
						description: 'Oil change',
						startDate: '2026-03-05',
						cost: -100000,
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should accept valid cost', async () => {
				const res = await app.request('/maintenance', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						vehicleId: 'vehicle-123',
						type: 'Scheduled',
						description: 'Oil change',
						startDate: '2026-03-05',
						cost: 500000,
					}),
				});

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: CreateMaintenanceRequest };
				expect(body.data.cost).toBe(500000);
			});

			it('[P1] should accept photos array', async () => {
				const res = await app.request('/maintenance', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						vehicleId: 'vehicle-123',
						type: 'Damage',
						description: 'Scratched fairing',
						startDate: '2026-03-05',
						photos: [
							{ url: 'https://example.com/photo1.jpg', caption: 'Front view' },
						],
					}),
				});

				expect(res.status).toBe(200);
			});

			it('[P1] should reject more than 10 photos', async () => {
				const photos = Array.from({ length: 11 }, (_, i) => ({
					url: `https://example.com/photo${i}.jpg`,
				}));

				const res = await app.request('/maintenance', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						vehicleId: 'vehicle-123',
						type: 'Damage',
						description: 'Scratched fairing',
						startDate: '2026-03-05',
						photos,
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should reject invalid photo URL', async () => {
				const res = await app.request('/maintenance', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						vehicleId: 'vehicle-123',
						type: 'Damage',
						description: 'Scratched fairing',
						startDate: '2026-03-05',
						photos: [
							{ url: 'not-a-url' },
						],
					}),
				});

				expect(res.status).toBe(400);
			});
		});

		describe('Update Maintenance Validation', () => {
			beforeEach(() => {
				app.use('/maintenance/:id', validateBody(updateMaintenanceSchema));
				app.patch('/maintenance/:id', (c) => {
					const body = getValidatedBody(c) as UpdateMaintenanceRequest;
					return c.json({ success: true, data: body });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept valid update data', async () => {
				const res = await app.request('/maintenance/maint-123', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						description: 'Updated description',
					}),
				});

				expect(res.status).toBe(200);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should accept empty body', async () => {
				const res = await app.request('/maintenance/maint-123', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				});

				expect(res.status).toBe(200);
			});

			it('[P1] should accept cost update', async () => {
				const res = await app.request('/maintenance/maint-123', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						cost: 750000,
					}),
				});

				expect(res.status).toBe(200);
			});

			it('[P1] should reject invalid type on update', async () => {
				const res = await app.request('/maintenance/maint-123', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						type: 'InvalidType',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should reject invalid date format on update', async () => {
				const res = await app.request('/maintenance/maint-123', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						startDate: '03-05-2026',
					}),
				});

				expect(res.status).toBe(400);
			});
		});

		describe('Complete Maintenance Validation', () => {
			beforeEach(() => {
				app.use('/maintenance/:id/complete', validateBody(completeMaintenanceSchema));
				app.post('/maintenance/:id/complete', (c) => {
					const body = getValidatedBody(c) as CompleteMaintenanceRequest;
					return c.json({ success: true, data: body });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept valid complete data', async () => {
				const res = await app.request('/maintenance/maint-123/complete', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						actualCost: 620000,
					}),
				});

				expect(res.status).toBe(200);
			});

			it('[P0] should accept empty body', async () => {
				const res = await app.request('/maintenance/maint-123/complete', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				});

				expect(res.status).toBe(200);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should reject negative actualCost', async () => {
				const res = await app.request('/maintenance/maint-123/complete', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						actualCost: -100000,
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should accept notes', async () => {
				const res = await app.request('/maintenance/maint-123/complete', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						notes: 'Completed successfully',
					}),
				});

				expect(res.status).toBe(200);
			});

			it('[P1] should reject notes too long', async () => {
				const res = await app.request('/maintenance/maint-123/complete', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						notes: 'a'.repeat(501),
					}),
				});

				expect(res.status).toBe(400);
			});
		});

		describe('List Query Validation', () => {
			beforeEach(() => {
				app.use('/maintenance', validateQuery(listMaintenanceQuerySchema));
				app.get('/maintenance', (c) => {
					const query = getValidatedQuery(c) as ListMaintenanceQuery;
					return c.json({ success: true, data: query });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should apply default values', async () => {
				const res = await app.request('/maintenance');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListMaintenanceQuery };
				expect(body.data.page).toBe(1);
				expect(body.data.limit).toBe(25);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should accept status filter', async () => {
				const res = await app.request('/maintenance?status=Scheduled');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListMaintenanceQuery };
				expect(body.data.status).toBe('Scheduled');
			});

			it('[P1] should accept type filter', async () => {
				const res = await app.request('/maintenance?type=Damage');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListMaintenanceQuery };
				expect(body.data.type).toBe('Damage');
			});

			it('[P1] should accept vehicleId filter', async () => {
				const res = await app.request('/maintenance?vehicleId=vehicle-123');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListMaintenanceQuery };
				expect(body.data.vehicleId).toBe('vehicle-123');
			});

			it('[P1] should reject invalid status', async () => {
				const res = await app.request('/maintenance?status=Invalid');

				expect(res.status).toBe(400);
			});

			it('[P1] should reject invalid type', async () => {
				const res = await app.request('/maintenance?type=Invalid');

				expect(res.status).toBe(400);
			});

			it('[P1] should reject limit exceeding max', async () => {
				const res = await app.request('/maintenance?limit=101');

				expect(res.status).toBe(400);
			});

			it('[P1] should accept combined filters', async () => {
				const res = await app.request('/maintenance?status=Completed&type=Scheduled&vehicleId=vehicle-123&page=2&limit=50');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListMaintenanceQuery };
				expect(body.data.status).toBe('Completed');
				expect(body.data.type).toBe('Scheduled');
				expect(body.data.vehicleId).toBe('vehicle-123');
				expect(body.data.page).toBe(2);
				expect(body.data.limit).toBe(50);
			});
		});

		describe('Vehicle History Query Validation', () => {
			beforeEach(() => {
				app.use('/vehicles/:vehicleId/history', validateQuery(vehicleHistoryQuerySchema));
				app.get('/vehicles/:vehicleId/history', (c) => {
					const query = getValidatedQuery(c) as VehicleHistoryQuery;
					return c.json({ success: true, data: query });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should apply default values', async () => {
				const res = await app.request('/vehicles/vehicle-123/history');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: VehicleHistoryQuery };
				expect(body.data.page).toBe(1);
				expect(body.data.limit).toBe(25);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should accept type filter', async () => {
				const res = await app.request('/vehicles/vehicle-123/history?type=Repair');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: VehicleHistoryQuery };
				expect(body.data.type).toBe('Repair');
			});

			it('[P1] should reject invalid type', async () => {
				const res = await app.request('/vehicles/vehicle-123/history?type=Invalid');

				expect(res.status).toBe(400);
			});
		});

		describe('Upcoming Query Validation', () => {
			beforeEach(() => {
				app.use('/maintenance/upcoming', validateQuery(upcomingQuerySchema));
				app.get('/maintenance/upcoming', (c) => {
					const query = getValidatedQuery(c) as UpcomingQuery;
					return c.json({ success: true, data: query });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should apply default days value', async () => {
				const res = await app.request('/maintenance/upcoming');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: UpcomingQuery };
				expect(body.data.days).toBe(30);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should accept custom days value', async () => {
				const res = await app.request('/maintenance/upcoming?days=60');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: UpcomingQuery };
				expect(body.data.days).toBe(60);
			});

			it('[P1] should reject days less than 1', async () => {
				const res = await app.request('/maintenance/upcoming?days=0');

				expect(res.status).toBe(400);
			});

			it('[P1] should reject days exceeding max', async () => {
				const res = await app.request('/maintenance/upcoming?days=366');

				expect(res.status).toBe(400);
			});
		});
	});

	describe('Error Handling Integration', () => {
		beforeEach(() => {
			app.get('/error/conflict', () => {
				throw new ConflictError('Vehicle already has active maintenance');
			});
			app.get('/error/not-found', () => {
				throw new NotFoundError('Maintenance record');
			});
			app.get('/error/validation', () => {
				throw new ValidationError('Cannot update completed maintenance records');
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
			expect(body.error.message).toContain('active maintenance');
		});

		it('[P0] should return 404 for NotFoundError', async () => {
			const res = await app.request('/error/not-found');

			expect(res.status).toBe(404);
			const body = await res.json() as { error: { message: string; code: string } };
			expect(body.error.code).toBe('NOT_FOUND');
			expect(body.error.message).toBe('Maintenance record not found');
		});

		it('[P0] should return 400 for ValidationError', async () => {
			const res = await app.request('/error/validation');

			expect(res.status).toBe(400);
			const body = await res.json() as { error: { message: string; code: string } };
			expect(body.error.code).toBe('VALIDATION_ERROR');
			expect(body.error.message).toContain('completed');
		});
	});

	describe('Response Format Integration', () => {
		beforeEach(() => {
			app.get('/maintenance', (c) => {
				return c.json({
					success: true,
					data: {
						items: [
							{
								id: 'maint-1',
								vehicleId: 'vehicle-1',
								type: 'Scheduled',
								description: 'Oil change',
								status: 'Scheduled',
								startDate: '2026-03-05',
								endDate: null,
								cost: 500000,
							},
							{
								id: 'maint-2',
								vehicleId: 'vehicle-2',
								type: 'Damage',
								description: 'Scratched fairing',
								status: 'InProgress',
								startDate: '2026-03-01',
								endDate: '2026-03-03',
								cost: 750000,
							},
						],
						meta: { page: 1, limit: 25, total: 2, totalPages: 1 },
					},
				});
			});

			app.get('/maintenance/upcoming', (c) => {
				return c.json({
					success: true,
					data: {
						scheduled: [
							{
								id: 'maint-1',
								vehicleId: 'vehicle-1',
								vehicleName: 'Honda CRF 250L',
								vehiclePlateNumber: 'B 1234 ABC',
								type: 'Scheduled',
								description: 'Oil change',
								scheduledDate: '2026-03-10',
								expectedEnd: null,
								daysUntil: 5,
								isOverdue: false,
							},
						],
						inProgress: [],
						overdue: [],
					},
				});
			});

			app.get('/maintenance/:id', (c) => {
				return c.json({
					success: true,
					data: {
						id: c.req.param('id'),
						vehicleId: 'vehicle-1',
						type: 'Scheduled',
						description: 'Oil change',
						status: 'Scheduled',
						startDate: '2026-03-05',
						endDate: null,
						cost: 500000,
						vehicle: {
							id: 'vehicle-1',
							name: 'Honda CRF 250L',
							plateNumber: 'B 1234 ABC',
							status: 'Maintenance',
						},
						booking: null,
						createdByUser: {
							id: 'user-1',
							name: 'Staff John',
						},
					},
				});
			});

			app.get('/vehicles/:vehicleId/maintenance/summary', (c) => {
				return c.json({
					success: true,
					data: {
						vehicle: {
							id: c.req.param('vehicleId'),
							name: 'Honda CRF 250L',
							plateNumber: 'B 1234 ABC',
						},
						summary: {
							totalRecords: 15,
							totalCost: 7500000,
							lastMaintenanceDate: '2026-02-28',
						},
						records: [],
					},
				});
			});
		});

		// ============================================
		// P0: Response Format Tests
		// ============================================

		it('[P0] should return success response format for single maintenance', async () => {
			const res = await app.request('/maintenance/maint-123');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { id: string } };
			expect(body.success).toBe(true);
			expect(body.data).toBeDefined();
		});

		it('[P0] should return paginated response format for maintenance list', async () => {
			const res = await app.request('/maintenance');

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

		it('[P1] should return upcoming maintenance response format', async () => {
			const res = await app.request('/maintenance/upcoming');

			expect(res.status).toBe(200);
			const body = await res.json() as {
				success: boolean;
				data: {
					scheduled: unknown[];
					inProgress: unknown[];
					overdue: unknown[];
				};
			};
			expect(body.success).toBe(true);
			expect(body.data.scheduled).toBeDefined();
			expect(body.data.inProgress).toBeDefined();
			expect(body.data.overdue).toBeDefined();
		});

		it('[P1] should return vehicle maintenance summary response format', async () => {
			const res = await app.request('/vehicles/vehicle-123/maintenance/summary');

			expect(res.status).toBe(200);
			const body = await res.json() as {
				success: boolean;
				data: {
					vehicle: { id: string };
					summary: { totalRecords: number; totalCost: number; lastMaintenanceDate: string | null };
					records: unknown[];
				};
			};
			expect(body.success).toBe(true);
			expect(body.data.vehicle).toBeDefined();
			expect(body.data.summary).toBeDefined();
		});

		it('[P1] should include vehicle details in maintenance response', async () => {
			const res = await app.request('/maintenance/maint-123');

			const body = await res.json() as {
				success: boolean;
				data: {
					vehicle?: { id: string; name: string; plateNumber: string; status: string } | null;
				};
			};
			expect(body.data.vehicle).toBeDefined();
			expect(body.data.vehicle?.name).toBe('Honda CRF 250L');
		});
	});
});
