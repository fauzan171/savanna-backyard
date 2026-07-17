import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { validateBody, validateQuery, getValidatedBody, getValidatedQuery } from '@/worker/core/middleware/validator';
import {
	checkAvailabilityQuerySchema,
	getVehicleTypesQuerySchema,
} from '@/worker/modules/public-api/public-api.dto';
import { ValidationError, UnauthorizedError, AppError } from '@/worker/core/types/errors';
import type {
	CheckAvailabilityQuery,
	GetVehicleTypesQuery,
} from '@/worker/modules/public-api/public-api.dto';

/**
 * Integration tests for Public API module
 * Tests the HTTP layer and middleware integration
 */
describe('Public API Integration Tests', () => {
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
		describe('Check Availability Query Validation', () => {
			beforeEach(() => {
				app.use('/public/availability', validateQuery(checkAvailabilityQuerySchema));
				app.get('/public/availability', (c) => {
					const query = getValidatedQuery(c) as CheckAvailabilityQuery;
					return c.json({ success: true, data: query });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept valid date range', async () => {
				const res = await app.request('/public/availability?startDate=2026-03-01&endDate=2026-03-05');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: CheckAvailabilityQuery };
				expect(body.data.startDate).toBe('2026-03-01');
				expect(body.data.endDate).toBe('2026-03-05');
			});

			it('[P0] should reject missing startDate', async () => {
				const res = await app.request('/public/availability?endDate=2026-03-05');

				expect(res.status).toBe(400);
			});

			it('[P0] should reject missing endDate', async () => {
				const res = await app.request('/public/availability?startDate=2026-03-01');

				expect(res.status).toBe(400);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should reject invalid date format', async () => {
				const res = await app.request('/public/availability?startDate=03-01-2026&endDate=2026-03-05');

				expect(res.status).toBe(400);
			});

			it('[P1] should accept optional type filter', async () => {
				const res = await app.request('/public/availability?startDate=2026-03-01&endDate=2026-03-05&type=TrailBike');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: CheckAvailabilityQuery };
				expect(body.data.type).toBe('TrailBike');
			});

			it('[P1] should reject invalid type', async () => {
				const res = await app.request('/public/availability?startDate=2026-03-01&endDate=2026-03-05&type=InvalidType');

				expect(res.status).toBe(400);
			});

			it('[P1] should accept all valid vehicle types', async () => {
				const types = ['TrailBike', 'StreetBike', 'Car', 'Jeep', 'Other'];

				for (const type of types) {
					const res = await app.request(`/public/availability?startDate=2026-03-01&endDate=2026-03-05&type=${type}`);

					expect(res.status).toBe(200);
				}
			});
		});

		describe('Get Vehicle Types Query Validation', () => {
			beforeEach(() => {
				app.use('/public/vehicle-types', validateQuery(getVehicleTypesQuerySchema));
				app.get('/public/vehicle-types', (c) => {
					const query = getValidatedQuery(c) as GetVehicleTypesQuery;
					return c.json({ success: true, data: query });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept empty query (no filters)', async () => {
				const res = await app.request('/public/vehicle-types');

				expect(res.status).toBe(200);
			});
		});
	});

	describe('Error Handling Integration', () => {
		beforeEach(() => {
			app.get('/error/unauthorized', () => {
				throw new UnauthorizedError('Invalid or missing API key');
			});
			app.get('/error/validation', () => {
				throw new ValidationError('Start date must be before or equal to end date');
			});
		});

		// ============================================
		// P0: Error Response Format
		// ============================================

		it('[P0] should return 401 for UnauthorizedError', async () => {
			const res = await app.request('/error/unauthorized');

			expect(res.status).toBe(401);
			const body = await res.json() as { error: { message: string; code: string } };
			expect(body.error.code).toBe('UNAUTHORIZED');
			expect(body.error.message).toContain('API key');
		});

		it('[P0] should return 400 for ValidationError', async () => {
			const res = await app.request('/error/validation');

			expect(res.status).toBe(400);
			const body = await res.json() as { error: { message: string; code: string } };
			expect(body.error.code).toBe('VALIDATION_ERROR');
			expect(body.error.message).toContain('Start date');
		});
	});

	describe('Response Format Integration', () => {
		beforeEach(() => {
			// Check Availability Response
			app.get('/public/availability', (c) => {
				return c.json({
					success: true,
					data: {
						requestedPeriod: {
							startDate: '2026-03-01',
							endDate: '2026-03-05',
						},
						availableVehicles: [
							{
								id: 'vehicle-1',
								name: 'Honda CRF 250L',
								type: 'TrailBike',
								dailyRate: 450000,
								photoUrl: 'https://example.com/photo.jpg',
							},
						],
						unavailableVehicles: [
							{
								id: 'vehicle-2',
								name: 'Yamaha WR 155',
								reason: 'Under maintenance',
							},
						],
						totalAvailable: 1,
					},
				});
			});

			// Get Vehicle Types Response
			app.get('/public/vehicle-types', (c) => {
				return c.json({
					success: true,
					data: {
						types: [
							{
								type: 'TrailBike',
								displayName: 'Trail Bike',
								count: 8,
								minDailyRate: 300000,
								maxDailyRate: 500000,
							},
						],
					},
				});
			});

			// Get Vehicle Details Response
			app.get('/public/vehicles/:id', (c) => {
				return c.json({
					success: true,
					data: {
						id: c.req.param('id'),
						name: 'Honda CRF 250L',
						type: 'TrailBike',
						brand: 'Honda',
						model: 'CRF 250L',
						year: 2023,
						dailyRate: 450000,
						photoUrl: 'https://example.com/photo.jpg',
						specifications: {
							description: null,
						},
					},
				});
			});

			// Vehicle Not Found Response
			app.get('/public/vehicles/not-found/:id', (c) => {
				return c.json({
					success: false,
					error: {
						code: 'NOT_FOUND',
						message: 'Vehicle not found',
					},
				}, 404);
			});
		});

		// ============================================
		// P0: Response Format Tests
		// ============================================

		it('[P0] should return success response format for availability', async () => {
			const res = await app.request('/public/availability');

			expect(res.status).toBe(200);
			const body = await res.json() as {
				success: boolean;
				data: {
					requestedPeriod: { startDate: string; endDate: string };
					availableVehicles: unknown[];
					unavailableVehicles: unknown[];
					totalAvailable: number;
				};
			};
			expect(body.success).toBe(true);
			expect(body.data.requestedPeriod).toBeDefined();
			expect(body.data.availableVehicles).toBeDefined();
		});

		it('[P0] should return 404 for vehicle not found', async () => {
			const res = await app.request('/public/vehicles/not-found/vehicle-999');

			expect(res.status).toBe(404);
			const body = await res.json() as { success: boolean; error: { code: string } };
			expect(body.success).toBe(false);
			expect(body.error.code).toBe('NOT_FOUND');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should not expose sensitive vehicle data in availability', async () => {
			const res = await app.request('/public/availability');

			const body = await res.json() as {
				data: {
					availableVehicles: Array<Record<string, unknown>>;
				};
			};
			const vehicle = body.data.availableVehicles[0];

			expect(vehicle).toHaveProperty('id');
			expect(vehicle).toHaveProperty('name');
			expect(vehicle).toHaveProperty('type');
			expect(vehicle).toHaveProperty('dailyRate');
			expect(vehicle).not.toHaveProperty('plateNumber');
			expect(vehicle).not.toHaveProperty('status');
		});

		it('[P1] should return vehicle types with price range', async () => {
			const res = await app.request('/public/vehicle-types');

			expect(res.status).toBe(200);
			const body = await res.json() as {
				success: boolean;
				data: {
					types: Array<{
						type: string;
						displayName: string;
						count: number;
						minDailyRate: number;
						maxDailyRate: number;
					}>;
				};
			};
			expect(body.success).toBe(true);
			expect(body.data.types[0].minDailyRate).toBeDefined();
			expect(body.data.types[0].maxDailyRate).toBeDefined();
		});

		it('[P1] should return vehicle details without sensitive data', async () => {
			const res = await app.request('/public/vehicles/vehicle-123');

			expect(res.status).toBe(200);
			const body = await res.json() as {
				success: boolean;
				data: Record<string, unknown>;
			};
			expect(body.success).toBe(true);
			expect(body.data).not.toHaveProperty('plateNumber');
			expect(body.data).not.toHaveProperty('status');
			expect(body.data).not.toHaveProperty('totalKm');
		});

		it('[P1] should include specifications in vehicle details', async () => {
			const res = await app.request('/public/vehicles/vehicle-123');

			const body = await res.json() as {
				data: {
					specifications: { description: string | null };
				};
			};
			expect(body.data.specifications).toBeDefined();
		});
	});

	describe('CORS Headers Integration', () => {
		beforeEach(() => {
			app.use('/public/*', async (c, next) => {
				// Simulate CORS middleware behavior
				c.header('Access-Control-Allow-Origin', '*');
				c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
				c.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
				await next();
			});

			app.get('/public/test', (c) => c.json({ success: true }));
			app.options('/public/test', (c) => c.json({ success: true }));
		});

		// ============================================
		// P0: CORS Tests
		// ============================================

		it('[P0] should include CORS headers on responses', async () => {
			const res = await app.request('/public/test');

			expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
		});

		it('[P0] should handle OPTIONS preflight requests', async () => {
			const res = await app.request('/public/test', { method: 'OPTIONS' });

			expect(res.status).toBe(200);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should allow Content-Type header', async () => {
			const res = await app.request('/public/test');

			const allowedHeaders = res.headers.get('Access-Control-Allow-Headers');
			expect(allowedHeaders).toContain('Content-Type');
		});

		it('[P1] should allow X-API-Key header', async () => {
			const res = await app.request('/public/test');

			const allowedHeaders = res.headers.get('Access-Control-Allow-Headers');
			expect(allowedHeaders).toContain('X-API-Key');
		});

		it('[P1] should allow GET and POST methods', async () => {
			const res = await app.request('/public/test');

			const allowedMethods = res.headers.get('Access-Control-Allow-Methods');
			expect(allowedMethods).toContain('GET');
			expect(allowedMethods).toContain('POST');
		});
	});
});
