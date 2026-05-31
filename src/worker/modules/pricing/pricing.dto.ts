import { z } from 'zod';

export const createPricingSchema = z.object({
	name: z.string().min(2),
	description: z.string().optional().nullable(),
	dailyPrice: z.number().int().min(0),
	multiDayPrice: z.number().int().min(0),
	features: z.array(z.string()),
	notIncluded: z.array(z.string()),
	highlighted: z.boolean().optional().default(false),
	icon: z.string().optional().nullable(),
	sortOrder: z.number().int().optional().default(0),
	isActive: z.boolean().optional().default(true),
});

export const updatePricingSchema = createPricingSchema.partial();

export type CreatePricingRequest = z.infer<typeof createPricingSchema>;
export type UpdatePricingRequest = z.infer<typeof updatePricingSchema>;
