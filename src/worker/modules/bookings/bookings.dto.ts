import { z } from 'zod';

// Addon schema for booking creation
export const addonInputSchema = z.object({
	type: z.enum(['TourGuide', 'SafetyGear', 'PickupDropoff', 'Package', 'Other']),
	description: z.string().max(500).optional().nullable(),
	amount: z.number().min(0),
	isMandatory: z.boolean().default(false),
});

// Create booking schema
export const createBookingSchema = z.object({
	customerId: z.string().uuid(),
	vehicleId: z.string().uuid(),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
	endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
	paymentTerms: z.enum(['DP_Pickup', 'Full_Upfront', 'DP_After', 'Flexible']),
	currency: z.enum(['IDR', 'USD']).default('IDR'),
	addons: z.array(addonInputSchema).optional().default([]),
	notes: z.string().max(2000).optional().nullable(),
}).refine(
	(data) => data.startDate <= data.endDate,
	{ message: 'Start date must be before or equal to end date' }
);

// Update booking schema (limited fields)
export const updateBookingSchema = z.object({
	notes: z.string().max(2000).optional().nullable(),
});

// Start rental schema
export const startRentalSchema = z.object({
	startKm: z.number().min(0),
	pickupNotes: z.string().max(1000).optional().nullable(),
});

// Complete rental schema
export const completeRentalSchema = z.object({
	actualReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
	endKm: z.number().min(0),
	returnNotes: z.string().max(1000).optional().nullable(),
	damageNotes: z.string().max(1000).optional().nullable(),
});

// Extend rental schema
export const extendRentalSchema = z.object({
	newEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
	notes: z.string().max(500).optional().nullable(),
}).refine(
	(data) => data.newEndDate,
	{ message: 'New end date is required' }
);

// Cancel booking schema
export const cancelBookingSchema = z.object({
	reason: z.string().min(1, 'Cancellation reason is required').max(500),
});

// Add addon schema
export const addAddonSchema = z.object({
	type: z.enum(['TourGuide', 'SafetyGear', 'PickupDropoff', 'Package', 'Other']),
	description: z.string().max(500).optional().nullable(),
	amount: z.number().min(0),
	isMandatory: z.boolean().default(false),
});

// List bookings query schema
export const listBookingsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(25),
	status: z.enum(['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled']).optional(),
	customerId: z.string().uuid().optional(),
	vehicleId: z.string().uuid().optional(),
	startDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	startDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	search: z.string().max(100).optional(),
});

// Availability query schema
export const availabilityQuerySchema = z.object({
	vehicleId: z.string().uuid().optional(),
	type: z.enum(['TrailBike', 'StreetBike', 'Car', 'Jeep', 'Other']).optional(),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
	endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
}).refine(
	(data) => data.startDate <= data.endDate,
	{ message: 'Start date must be before or equal to end date' }
);

// Calendar query schema
export const calendarQuerySchema = z.object({
	month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)'),
});

// Types
export type CreateBookingRequest = z.infer<typeof createBookingSchema>;
export type UpdateBookingRequest = z.infer<typeof updateBookingSchema>;
export type StartRentalRequest = z.infer<typeof startRentalSchema>;
export type CompleteRentalRequest = z.infer<typeof completeRentalSchema>;
export type ExtendRentalRequest = z.infer<typeof extendRentalSchema>;
export type CancelBookingRequest = z.infer<typeof cancelBookingSchema>;
export type AddAddonRequest = z.infer<typeof addAddonSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
export type AddonInput = z.infer<typeof addonInputSchema>;
