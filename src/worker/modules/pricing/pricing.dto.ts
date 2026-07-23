import { z } from 'zod';
import { sanitizeText } from '@/worker/core/schemas/sanitize';

const safeOptText = z
	.string()
	.optional()
	.nullable()
	.transform((v) => (v == null ? v : (sanitizeText(v) as string)));

// PRIC-02: prices must be positive (reject 0) with an upper bound
const priceField = (label: string) =>
	z
		.number()
		.int()
		.min(1, `${label} must be greater than 0`)
		.max(1_000_000_000, `${label} is too large`);

export const createPricingSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2)
		.max(200)
		.transform((v) => sanitizeText(v) as string),
	description: safeOptText,
	dailyPrice: priceField('Daily price'),
	multiDayPrice: priceField('Multi-day price'),
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
