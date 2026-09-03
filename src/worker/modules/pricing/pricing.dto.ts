import { z } from 'zod';
import { sanitizeText } from '@/worker/core/schemas/sanitize';

const safeOptText = z
	.string()
	.optional()
	.nullable()
	.transform((v) => (v == null ? v : (sanitizeText(v) as string)));

// PRIC-02: prices must be positive (reject 0) with an upper bound
// FIX: use coerce to accept strings from forms and convert to numbers
const priceField = (label: string) =>
	z
		.coerce
		.number()
		.int()
		.min(1, `${label} must be greater than 0`)
		.max(1_000_000_000, `${label} is too large`);

// LC-006: optional USD counterpart, mirroring vehicles.dailyRateUsd
const optPriceField = (label: string) =>
	z.preprocess(
		(v) => (v === '' || v === undefined ? null : v),
		z.coerce.number().int().min(1, `${label} must be greater than 0`).max(1_000_000, `${label} is too large`).nullable().optional()
	);

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
	dailyPriceUsd: optPriceField('Daily USD price'),
	multiDayPriceUsd: optPriceField('Multi-day USD price'),
	features: z.array(z.string()),
	notIncluded: z.array(z.string()),
	highlighted: z.boolean().optional().default(false),
	icon: z.string().optional().nullable(),
	sortOrder: z.coerce.number().int().optional().default(0),
	isActive: z.boolean().optional().default(true),
});

export const updatePricingSchema = createPricingSchema.partial();

export type CreatePricingRequest = z.infer<typeof createPricingSchema>;
export type UpdatePricingRequest = z.infer<typeof updatePricingSchema>;
