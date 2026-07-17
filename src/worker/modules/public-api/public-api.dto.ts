import { z } from 'zod';

// Check availability query schema
// startDate/endDate accept either YYYY-MM-DD or ISO 8601 datetime
const isoOrDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

export const checkAvailabilityQuerySchema = z.object({
	startDate: z.string().regex(isoOrDateRegex, 'Invalid date format (YYYY-MM-DD or ISO 8601 datetime)'),
	endDate: z.string().regex(isoOrDateRegex, 'Invalid date format (YYYY-MM-DD or ISO 8601 datetime)'),
	type: z.enum(['TrailBike', 'StreetBike', 'Car', 'Jeep', 'Other']).optional(),
});

// Get vehicle types query schema
export const getVehicleTypesQuerySchema = z.object({});

// Create booking schema
// startDate/endDate accept either YYYY-MM-DD or ISO 8601 datetime (supports12-hour blocks)
export const createPublicBookingSchema = z.object({
	vehicleId: z.string().min(1, 'Vehicle ID is required'),
	startDate: z.string().regex(isoOrDateRegex, 'Invalid date format (YYYY-MM-DD or ISO 8601 datetime)'),
	endDate: z.string().regex(isoOrDateRegex, 'Invalid date format (YYYY-MM-DD or ISO 8601 datetime)'),
	customerName: z.string().min(2, 'Name must be at least 2 characters'),
	customerPhone: z.string().min(8, 'Phone number must be at least 8 characters'),
	customerEmail: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
	notes: z.string().max(1000).optional().nullable().or(z.literal('')),
	/** Payment method: 'QRIS' | 'BankTransfer' | 'Gateway' (all methods). Default: 'Gateway' */
	paymentMethod: z.enum(['QRIS', 'BankTransfer', 'Gateway']).optional(),
	/** Equipment line items to rent alongside the vehicle (per-block, same duration). */
	equipment: z.array(z.object({
		equipmentId: z.string().min(1),
		quantity: z.number().int().min(1),
	})).optional(),
	/** 'full' (pay everything) or 'dp' (down-payment via Xendit allow_partial). Default: 'full' */
	paymentType: z.enum(['full', 'dp']).optional(),
});

// Types
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