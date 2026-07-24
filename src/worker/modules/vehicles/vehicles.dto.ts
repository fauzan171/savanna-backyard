import { z } from 'zod';
import { urlOrPath } from '@/worker/core/schemas/url';
import { sanitizeText } from '@/worker/core/schemas/sanitize';

// Shared field schemas (VEH-03: XSS sanitize free text; FRM-05: trim required)
const nameField = z
	.string()
	.trim()
	.min(2, 'Name must be at least 2 characters')
	.max(100)
	.transform((v) => sanitizeText(v) as string);

// Normalize plate: uppercase + collapse whitespace (VEH-02/13: prevents
// "b 123 xx" vs "B 123 XX" bypassing the uniqueness check)
const plateField = z
	.string()
	.trim()
	.min(1, 'Plate number is required')
	.max(20)
	.transform((v) => v.replace(/\s+/g, ' ').toUpperCase());

const brandModelField = z
	.string()
	.max(50)
	.optional()
	.nullable()
	.transform((v) => (v == null ? v : (sanitizeText(v) as string)));

// Create vehicle schema
export const createVehicleSchema = z.object({
	name: nameField,
	plateNumber: plateField,
	type: z.enum(['TrailBike', 'StreetBike', 'Car', 'Jeep', 'Other']),
	brand: brandModelField,
	model: brandModelField,
	year: z.number().int().min(1990).max(2030).optional().nullable(),
	// VEH-04: enforce upper bound so absurd values cannot be stored
	dailyRateIdr: z
		.number()
		.positive('Daily rate must be positive')
		.max(50_000_000, 'Daily rate cannot exceed Rp 50.000.000'),
	dailyRateUsd: z
		.number()
		.positive()
		.max(10_000, 'Daily rate (USD) cannot exceed $10.000')
		.optional()
		.nullable(),
	description: z
		.string()
		.max(1000)
		.optional()
		.nullable()
		.transform((v) => (v == null ? v : (sanitizeText(v) as string))),
	photoUrl: urlOrPath.optional().nullable(),
});

// Update vehicle schema (all fields optional)
export const updateVehicleSchema = z.object({
	name: nameField.optional(),
	plateNumber: plateField.optional(),
	type: z.enum(['TrailBike', 'StreetBike', 'Car', 'Jeep', 'Other']).optional(),
	brand: brandModelField,
	model: brandModelField,
	year: z.number().int().min(1990).max(2030).optional().nullable(),
	dailyRateIdr: z
		.number()
		.positive('Daily rate must be positive')
		.max(50_000_000, 'Daily rate cannot exceed Rp 50.000.000')
		.optional(),
	dailyRateUsd: z
		.number()
		.positive()
		.max(10_000, 'Daily rate (USD) cannot exceed $10.000')
		.optional()
		.nullable(),
	description: z
		.string()
		.max(1000)
		.optional()
		.nullable()
		.transform((v) => (v == null ? v : (sanitizeText(v) as string))),
	totalKm: z.number().min(0).optional().nullable(),
	photoUrl: urlOrPath.optional().nullable(),
});

// Update status schema
export const updateStatusSchema = z.object({
	status: z.enum(['Available', 'Rented', 'Maintenance', 'Inactive']),
	notes: z
		.string()
		.max(500)
		.optional()
		.nullable()
		.transform((v) => (v == null ? v : (sanitizeText(v) as string))),
});

// List query schema
export const listVehiclesQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(25),
	status: z.enum(['Available', 'Rented', 'Maintenance', 'Inactive']).optional(),
	type: z.enum(['TrailBike', 'StreetBike', 'Car', 'Jeep', 'Other']).optional(),
	search: z.string().optional(),
});

// Availability query schema
export const availabilityQuerySchema = z.object({
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
	endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
	type: z.enum(['TrailBike', 'StreetBike', 'Car', 'Jeep', 'Other']).optional(),
	vehicleId: z.string().optional(),
});

// Calendar query schema
export const calendarQuerySchema = z.object({
	month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)'),
});

// Calendar matrix query schema (admin fleet matrix: vehicles × dates)
export const calendarMatrixQuerySchema = z.object({
	month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)'),
	type: z.enum(['TrailBike', 'StreetBike', 'Car', 'Jeep', 'Other']).optional(),
	status: z.enum(['Available', 'Rented', 'Maintenance', 'Inactive']).optional(),
});

// Types
export type CreateVehicleRequest = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleRequest = z.infer<typeof updateVehicleSchema>;
export type UpdateStatusRequest = z.infer<typeof updateStatusSchema>;
export type ListVehiclesQuery = z.infer<typeof listVehiclesQuerySchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
export type CalendarMatrixQuery = z.infer<typeof calendarMatrixQuerySchema>;
