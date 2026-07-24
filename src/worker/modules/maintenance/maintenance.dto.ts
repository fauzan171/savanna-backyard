import { z } from 'zod';
import { urlOrPath } from '@/worker/core/schemas/url';
import { sanitizeText } from '@/worker/core/schemas/sanitize';

// Photo schema
const maintenancePhotoSchema = z.object({
	url: urlOrPath,
	caption: z
		.string()
		.max(200)
		.optional()
		.transform((v) => (v == null ? v : (sanitizeText(v) as string))),
	uploadedAt: z.string().optional(),
});

// MAINT-03: cost non-negative with an upper bound
const costField = z
	.number()
	.nonnegative('Cost must be non-negative')
	.max(500_000_000, 'Cost is too large')
	.optional()
	.nullable();

// Create maintenance schema
export const createMaintenanceSchema = z
	.object({
		vehicleId: z.string().min(1, 'Vehicle ID is required'),
		type: z.enum(['Scheduled', 'Repair', 'Damage']),
		description: z
			.string()
			.trim()
			.min(5, 'Description must be at least 5 characters')
			.max(1000)
			.transform((v) => sanitizeText(v) as string),
		cost: costField,
		startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
		endDate: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
			.optional()
			.nullable(),
		bookingId: z.string().optional().nullable(),
		photos: z.array(maintenancePhotoSchema).max(10, 'Maximum 10 photos allowed').optional().nullable(),
		notes: z
			.string()
			.max(500)
			.optional()
			.nullable()
			.transform((v) => (v == null ? v : (sanitizeText(v) as string))),
	})
	// MAINT-02: endDate must not precede startDate
	.refine((data) => !(data.endDate && data.endDate < data.startDate), {
		message: 'End date cannot be before start date',
		path: ['endDate'],
	});

// Update maintenance schema
export const updateMaintenanceSchema = z
	.object({
		type: z.enum(['Scheduled', 'Repair', 'Damage']).optional(),
		description: z
			.string()
			.trim()
			.min(5)
			.max(1000)
			.optional()
			.transform((v) => (v == null ? v : (sanitizeText(v) as string))),
		cost: costField,
		startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
		endDate: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
			.optional()
			.nullable(),
		photos: z.array(maintenancePhotoSchema).max(10, 'Maximum 10 photos allowed').optional().nullable(),
		notes: z
			.string()
			.max(500)
			.optional()
			.nullable()
			.transform((v) => (v == null ? v : (sanitizeText(v) as string))),
	})
	.refine(
		(data) => {
			// Only enforce when both dates are present
			if (data.endDate && data.startDate) {
				return data.endDate >= data.startDate;
			}
			return true;
		},
		{ message: 'End date cannot be before start date', path: ['endDate'] },
	);

// Complete maintenance schema
export const completeMaintenanceSchema = z.object({
	actualCost: z
		.number()
		.nonnegative()
		.max(500_000_000, 'Cost is too large')
		.optional()
		.nullable(),
	notes: z
		.string()
		.max(500)
		.optional()
		.nullable()
		.transform((v) => (v == null ? v : (sanitizeText(v) as string))),
});

// List query schema
export const listMaintenanceQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(25),
	status: z.enum(['Scheduled', 'InProgress', 'Completed']).optional(),
	type: z.enum(['Scheduled', 'Repair', 'Damage']).optional(),
	vehicleId: z.string().optional(),
});

// Vehicle history query schema
export const vehicleHistoryQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(25),
	type: z.enum(['Scheduled', 'Repair', 'Damage']).optional(),
});

// Upcoming query schema
export const upcomingQuerySchema = z.object({
	days: z.coerce.number().int().min(1).max(365).default(30),
});

// Types
export type CreateMaintenanceRequest = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceRequest = z.infer<typeof updateMaintenanceSchema>;
export type CompleteMaintenanceRequest = z.infer<typeof completeMaintenanceSchema>;
export type ListMaintenanceQuery = z.infer<typeof listMaintenanceQuerySchema>;
export type VehicleHistoryQuery = z.infer<typeof vehicleHistoryQuerySchema>;
export type UpcomingQuery = z.infer<typeof upcomingQuerySchema>;
