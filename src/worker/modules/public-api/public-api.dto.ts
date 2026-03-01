import { z } from 'zod';

// Submit Lead Schema
export const submitLeadSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters'),
	phone: z.string().min(10, 'Phone number must be at least 10 characters'),
	email: z.string().email('Invalid email address').optional().nullable(),
	message: z.string().max(1000, 'Message must be at most 1000 characters').optional().nullable(),
	source: z.enum(['WhatsApp', 'Instagram', 'Facebook', 'TikTok', 'Website', 'WalkIn']).optional(),
	preferredDates: z.object({
		start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
		end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
		vehicleInterest: z.enum(['TrailBike', 'StreetBike', 'Car', 'Jeep', 'Other']).optional(),
		vehicleTypeId: z.string().optional(),
	}).optional().nullable(),
});

// Check availability query schema
export const checkAvailabilityQuerySchema = z.object({
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
	endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
	type: z.enum(['TrailBike', 'StreetBike', 'Car', 'Jeep', 'Other']).optional(),
});

// Get vehicle types query schema
export const getVehicleTypesQuerySchema = z.object({
	// No filters currently
});

// Types
export type SubmitLeadRequest = z.infer<typeof submitLeadSchema>;
export type CheckAvailabilityQuery = z.infer<typeof checkAvailabilityQuerySchema>;
export type GetVehicleTypesQuery = z.infer<typeof getVehicleTypesQuerySchema>;
