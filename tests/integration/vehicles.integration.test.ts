import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { validateBody, validateQuery, getValidatedBody, getValidatedQuery } from '@/worker/core/middleware/validator';
import {
	createVehicleSchema,
	updateVehicleSchema,
	updateStatusSchema,
	listVehiclesQuerySchema,
	availabilityQuerySchema,
	calendarQuerySchema,
} from '@/worker/modules/vehicles/vehicles.dto';
import { ConflictError, NotFoundError, ValidationError, AppError } from '@/worker/core/types/errors';
import type {
	ListVehiclesQuery,
	CreateVehicleRequest,
	UpdateVehicleRequest,
	UpdateStatusRequest,
	AvailabilityQuery,
	CalendarQuery,
} from '@/worker/modules/vehicles/vehicles.dto';

/**
 * Integration tests for Vehicles module
 * Tests the HTTP layer and middleware integration
 */
describe('Vehicles Integration Tests', () => {
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
		describe('Create Vehicle Validation', () => {
			beforeEach(() => {
				app.use('/vehicles', validateBody(createVehicleSchema));
				app.post('/vehicles', (c) => {
					const body = getValidatedBody(c) as CreateVehicleRequest;
					return c.json({ success: true, data: body });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept valid vehicle data', async () => {
				const res = await app.request('/vehicles', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Honda CRF 250L',
						plateNumber: 'B 1234 ABC',
						type: 'TrailBike',
						dailyRateIdr: 450000,
					}),
				});

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: CreateVehicleRequest };
				expect(body.success).toBe(true);
				expect(body.data.name).toBe('Honda CRF 250L');
			});

			it('[P0] should reject missing name', async () => {
				const res = await app.request('/vehicles', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						plateNumber: 'B 1234 ABC',
						type: 'TrailBike',
						dailyRateIdr: 450000,
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P0] should reject missing plateNumber', async () => {
				const res = await app.request('/vehicles', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Honda CRF 250L',
						type: 'TrailBike',
						dailyRateIdr: 450000,
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P0] should reject missing type', async () => {
				const res = await app.request('/vehicles', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Honda CRF 250L',
						plateNumber: 'B 1234 ABC',
						dailyRateIdr: 450000,
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P0] should reject missing dailyRateIdr', async () => {
				const res = await app.request('/vehicles', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Honda CRF 250L',
						plateNumber: 'B 1234 ABC',
						type: 'TrailBike',
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P0] should reject negative dailyRateIdr', async () => {
				const res = await app.request('/vehicles', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Honda CRF 250L',
						plateNumber: 'B 1234 ABC',
						type: 'TrailBike',
						dailyRateIdr: -100000,
					}),
				});

				expect(res.status).toBe(400);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should accept all valid vehicle types', async () => {
				const types = ['TrailBike', 'StreetBike', 'Car', 'Jeep', 'Other'];

				for (const type of types) {
					const res = await app.request('/vehicles', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							name: 'Test Vehicle',
							plateNumber: `B 000${types.indexOf(type)} TST`,
							type,
							dailyRateIdr: 450000,
						}),
					});

					expect(res.status).toBe(200);
				}
			});

			it('[P1] should reject invalid vehicle type', async () => {
				const res = await app.request('/vehicles', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Honda CRF 250L',
						plateNumber: 'B 1234 ABC',
						type: 'InvalidType',
						dailyRateIdr: 450000,
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should reject name too short', async () => {
				const res = await app.request('/vehicles', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'H',
						plateNumber: 'B 1234 ABC',
						type: 'TrailBike',
						dailyRateIdr: 450000,
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should accept valid year', async () => {
				const res = await app.request('/vehicles', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Honda CRF 250L',
						plateNumber: 'B 1234 ABC',
						type: 'TrailBike',
						dailyRateIdr: 450000,
						year: 2023,
					}),
				});

				expect(res.status).toBe(200);
			});

			it('[P1] should reject year too old', async () => {
				const res = await app.request('/vehicles', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Honda CRF 250L',
						plateNumber: 'B 1234 ABC',
						type: 'TrailBike',
						dailyRateIdr: 450000,
						year: 1980,
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should reject year in future beyond +1', async () => {
				const res = await app.request('/vehicles', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Honda CRF 250L',
						plateNumber: 'B 1234 ABC',
						type: 'TrailBike',
						dailyRateIdr: 450000,
						year: new Date().getFullYear() + 5,
					}),
				});

				expect(res.status).toBe(400);
			});

			it('[P1] should accept valid photoUrl', async () => {
				const res = await app.request('/vehicles', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Honda CRF 250L',
						plateNumber: 'B 1234 ABC',
						type: 'TrailBike',
						dailyRateIdr: 450000,
						photoUrl: 'https://example.com/photo.jpg',
					}),
				});

				expect(res.status).toBe(200);
			});

			it('[P1] should reject invalid photoUrl', async () => {
				const res = await app.request('/vehicles', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: 'Honda CRF 250L',
						plateNumber: 'B 1234 ABC',
						type: 'TrailBike',
						dailyRateIdr: 450000,
						photoUrl: 'not-a-url',
					}),
				});

				expect(res.status).toBe(400);
			});
		});

		describe('Update Vehicle Validation', () => {
			beforeEach(() => {
				app.use('/vehicles/:id', validateBody(updateVehicleSchema));
				app.patch('/vehicles/:id', (c) => {
					const body = getValidatedBody(c) as UpdateVehicleRequest;
					return c.json({ success: true, data: body });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept valid update data', async () => {
				const res = await app.request('/vehicles/veh-123', {
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
				const res = await app.request('/vehicles/veh-123', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				});

				expect(res.status).toBe(200);
			});

			it('[P1] should accept totalKm update', async () => {
				const res = await app.request('/vehicles/veh-123', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						totalKm: 15000,
					}),
				});

				expect(res.status).toBe(200);
			});
		});

		describe('Update Status Validation', () => {
			beforeEach(() => {
				app.use('/vehicles/:id/status', validateBody(updateStatusSchema));
				app.patch('/vehicles/:id/status', (c) => {
					const body = getValidatedBody(c) as UpdateStatusRequest;
					return c.json({ success: true, data: body });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept valid status update', async () => {
				const res = await app.request('/vehicles/veh-123/status', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						status: 'Rented',
					}),
				});

				expect(res.status).toBe(200);
			});

			it('[P0] should reject invalid status', async () => {
				const res = await app.request('/vehicles/veh-123/status', {
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
				const statuses = ['Available', 'Rented', 'Maintenance', 'Inactive'];

				for (const status of statuses) {
					const res = await app.request('/vehicles/veh-123/status', {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ status }),
					});

					expect(res.status).toBe(200);
				}
			});

			it('[P1] should accept optional notes', async () => {
				const res = await app.request('/vehicles/veh-123/status', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						status: 'Maintenance',
						notes: 'Scheduled for oil change',
					}),
				});

				expect(res.status).toBe(200);
			});
		});

		describe('List Query Validation', () => {
			beforeEach(() => {
				app.use('/vehicles', validateQuery(listVehiclesQuerySchema));
				app.get('/vehicles', (c) => {
					const query = getValidatedQuery(c) as ListVehiclesQuery;
					return c.json({ success: true, data: query });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should apply default values', async () => {
				const res = await app.request('/vehicles');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListVehiclesQuery };
				expect(body.data.page).toBe(1);
				expect(body.data.limit).toBe(25);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should accept status filter', async () => {
				const res = await app.request('/vehicles?status=Available');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListVehiclesQuery };
				expect(body.data.status).toBe('Available');
			});

			it('[P1] should accept type filter', async () => {
				const res = await app.request('/vehicles?type=TrailBike');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListVehiclesQuery };
				expect(body.data.type).toBe('TrailBike');
			});

			it('[P1] should accept search parameter', async () => {
				const res = await app.request('/vehicles?search=Honda');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: ListVehiclesQuery };
				expect(body.data.search).toBe('Honda');
			});

			it('[P1] should reject invalid status', async () => {
				const res = await app.request('/vehicles?status=Invalid');

				expect(res.status).toBe(400);
			});

			it('[P1] should reject limit exceeding max', async () => {
				const res = await app.request('/vehicles?limit=101');

				expect(res.status).toBe(400);
			});
		});

		describe('Availability Query Validation', () => {
			beforeEach(() => {
				app.use('/vehicles/availability', validateQuery(availabilityQuerySchema));
				app.get('/vehicles/availability', (c) => {
					const query = getValidatedQuery(c) as AvailabilityQuery;
					return c.json({ success: true, data: query });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept valid date range', async () => {
				const res = await app.request('/vehicles/availability?startDate=2026-03-01&endDate=2026-03-05');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: AvailabilityQuery };
				expect(body.data.startDate).toBe('2026-03-01');
				expect(body.data.endDate).toBe('2026-03-05');
			});

			it('[P0] should reject missing startDate', async () => {
				const res = await app.request('/vehicles/availability?endDate=2026-03-05');

				expect(res.status).toBe(400);
			});

			it('[P0] should reject missing endDate', async () => {
				const res = await app.request('/vehicles/availability?startDate=2026-03-01');

				expect(res.status).toBe(400);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should reject invalid date format', async () => {
				const res = await app.request('/vehicles/availability?startDate=03-01-2026&endDate=2026-03-05');

				expect(res.status).toBe(400);
			});

			it('[P1] should accept optional type filter', async () => {
				const res = await app.request('/vehicles/availability?startDate=2026-03-01&endDate=2026-03-05&type=TrailBike');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: AvailabilityQuery };
				expect(body.data.type).toBe('TrailBike');
			});

			it('[P1] should accept optional vehicleId', async () => {
				const res = await app.request('/vehicles/availability?startDate=2026-03-01&endDate=2026-03-05&vehicleId=veh-123');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: AvailabilityQuery };
				expect(body.data.vehicleId).toBe('veh-123');
			});
		});

		describe('Calendar Query Validation', () => {
			beforeEach(() => {
				app.use('/vehicles/:id/calendar', validateQuery(calendarQuerySchema));
				app.get('/vehicles/:id/calendar', (c) => {
					const query = getValidatedQuery(c) as CalendarQuery;
					return c.json({ success: true, data: query });
				});
			});

			// ============================================
			// P0: Validation Tests
			// ============================================

			it('[P0] should accept valid month format', async () => {
				const res = await app.request('/vehicles/veh-123/calendar?month=2026-03');

				expect(res.status).toBe(200);
				const body = await res.json() as { success: boolean; data: CalendarQuery };
				expect(body.data.month).toBe('2026-03');
			});

			it('[P0] should reject invalid month format', async () => {
				const res = await app.request('/vehicles/veh-123/calendar?month=03-2026');

				expect(res.status).toBe(400);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should reject missing month', async () => {
				const res = await app.request('/vehicles/veh-123/calendar');

				expect(res.status).toBe(400);
			});

			it('[P1] should reject invalid month format with slashes', async () => {
				const res = await app.request('/vehicles/veh-123/calendar?month=2026/03');

				expect(res.status).toBe(400);
			});
		});
	});

	describe('Error Handling Integration', () => {
		beforeEach(() => {
			app.get('/error/conflict', () => {
				throw new ConflictError('Vehicle with this plate number already exists');
			});
			app.get('/error/not-found', () => {
				throw new NotFoundError('Vehicle');
			});
			app.get('/error/validation', () => {
				throw new ValidationError('Start date must be before or equal to end date');
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
			expect(body.error.message).toContain('plate number already exists');
		});

		it('[P0] should return 404 for NotFoundError', async () => {
			const res = await app.request('/error/not-found');

			expect(res.status).toBe(404);
			const body = await res.json() as { error: { message: string; code: string } };
			expect(body.error.code).toBe('NOT_FOUND');
			expect(body.error.message).toBe('Vehicle not found');
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
			// Register more specific routes first to avoid :id matching
			app.get('/vehicles/availability', (c) => {
				return c.json({
					success: true,
					data: {
						requestedPeriod: {
							startDate: '2026-03-01',
							endDate: '2026-03-05',
						},
						availableVehicles: [
							{ id: '1', name: 'Honda CRF 250L' },
						],
						unavailableVehicles: [],
						maintenanceVehicles: [],
					},
				});
			});

			app.get('/vehicles/:id/calendar', (c) => {
				return c.json({
					success: true,
					data: {
						vehicleId: c.req.param('id'),
						month: '2026-03',
						calendar: [
							{ date: '2026-03-01', status: 'available' },
							{ date: '2026-03-02', status: 'booked', bookingId: 'book-1' },
						],
					},
				});
			});

			app.get('/vehicles/:id', (c) => {
				return c.json({
					success: true,
					data: {
						id: c.req.param('id'),
						name: 'Honda CRF 250L',
						plateNumber: 'B 1234 ABC',
						type: 'TrailBike',
						status: 'Available',
						dailyRateIdr: 450000,
						createdAt: new Date().toISOString(),
					},
				});
			});

			app.get('/vehicles', (c) => {
				return c.json({
					success: true,
					data: {
						items: [
							{ id: '1', name: 'Honda CRF 250L', status: 'Available' },
							{ id: '2', name: 'Yamaha WR 155', status: 'Rented' },
						],
						meta: { page: 1, limit: 25, total: 2, totalPages: 1 },
					},
				});
			});
		});

		// ============================================
		// P0: Response Format Tests
		// ============================================

		it('[P0] should return success response format for single vehicle', async () => {
			const res = await app.request('/vehicles/veh-123');

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; data: { id: string } };
			expect(body.success).toBe(true);
			expect(body.data).toBeDefined();
		});

		it('[P0] should return paginated response format for vehicle list', async () => {
			const res = await app.request('/vehicles');

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

		it('[P1] should return availability response format', async () => {
			// Use query parameters as required by validation
			const res = await app.request('/vehicles/availability?startDate=2026-03-01&endDate=2026-03-05');

			expect(res.status).toBe(200);
			const body = await res.json() as {
				success: boolean;
				data: {
					requestedPeriod: { startDate: string; endDate: string };
					availableVehicles: unknown[];
					unavailableVehicles: unknown[];
					maintenanceVehicles: unknown[];
				};
			};
			expect(body.success).toBe(true);
			expect(body.data.requestedPeriod).toBeDefined();
			expect(body.data.availableVehicles).toBeDefined();
		});

		it('[P1] should return calendar response format', async () => {
			const res = await app.request('/vehicles/veh-123/calendar');

			expect(res.status).toBe(200);
			const body = await res.json() as {
				success: boolean;
				data: {
					vehicleId: string;
					month: string;
					calendar: unknown[];
				};
			};
			expect(body.success).toBe(true);
			expect(body.data.vehicleId).toBe('veh-123');
			expect(body.data.calendar).toBeDefined();
		});
	});
});
