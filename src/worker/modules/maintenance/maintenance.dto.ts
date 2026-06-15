import { z } from 'zod';
import { urlOrPath } from '@/worker/core/schemas/url';

// Photo schema
const maintenancePhotoSchema = z.object({
	url: urlOrPath,
	caption: z.string().max(200).optional(),
	uploadedAt: z.string().optional(),
});

// Create maintenance schema
export const createMaintenanceSchema = z.object({
	vehicleId: z.string().min(1, 'Vehicle ID is required'),
	type: z.enum(['Scheduled', 'Repair', 'Damage']),
	description: z.string().min(5, 'Description must be at least 5 characters').max(1000),
	cost: z.number().nonnegative('Cost must be non-negative').optional().nullable(),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
	endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().nullable(),
	bookingId: z.string().optional().nullable(),
	photos: z.array(maintenancePhotoSchema).max(10, 'Maximum 10 photos allowed').optional().nullable(),
	notes: z.string().max(500).optional().nullable(),
});

// Update maintenance schema
export const updateMaintenanceSchema = z.object({
	type: z.enum(['Scheduled', 'Repair', 'Damage']).optional(),
	description: z.string().min(5).max(1000).optional(),
	cost: z.number().nonnegative().optional().nullable(),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
	endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional().nullable(),
	photos: z.array(maintenancePhotoSchema).max(10, 'Maximum 10 photos allowed').optional().nullable(),
	notes: z.string().max(500).optional().nullable(),
});

// Complete maintenance schema
export const completeMaintenanceSchema = z.object({
	actualCost: z.number().nonnegative().optional().nullable(),
	notes: z.string().max(500).optional().nullable(),
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
