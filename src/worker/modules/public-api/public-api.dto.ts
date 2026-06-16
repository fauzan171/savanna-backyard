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
export const getVehicleTypesQuerySchema = z.object({});

// Create booking schema
export const createPublicBookingSchema = z.object({
	vehicleId: z.string().min(1, 'Vehicle ID is required'),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
	endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
	customerName: z.string().min(2, 'Name must be at least 2 characters'),
	customerPhone: z.string().min(8, 'Phone number must be at least 8 characters'),
	customerEmail: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
	notes: z.string().max(1000).optional().nullable().or(z.literal('')),
	/** Payment method: 'QRIS' | 'BankTransfer' | 'Gateway' (all methods). Default: 'Gateway' */
	paymentMethod: z.enum(['QRIS', 'BankTransfer', 'Gateway']).optional(),
});

// Types
export type SubmitLeadRequest = z.infer<typeof submitLeadSchema>;
export type CheckAvailabilityQuery = z.infer<typeof checkAvailabilityQuerySchema>;
export type GetVehicleTypesQuery = z.infer<typeof getVehicleTypesQuerySchema>;
export type CreatePublicBookingRequest = z.infer<typeof createPublicBookingSchema>;

// Fase 2: Reviews query schema
export const getPublicReviewsQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).optional(),
	offset: z.coerce.number().int().min(0).optional(),
	rating: z.coerce.number().int().min(1).max(5).optional(),
});

export type GetPublicReviewsQuery = z.infer<typeof getPublicReviewsQuerySchema>;