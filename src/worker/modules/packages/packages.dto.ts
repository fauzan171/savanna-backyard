import { z } from 'zod';
import { sanitizeText } from '@/worker/core/schemas/sanitize';

const safeOptText = z
	.string()
	.optional()
	.nullable()
	.transform((v) => (v == null ? v : (sanitizeText(v) as string)));

// PKG-03: price must be positive (reject 0 and negatives)
// PKG-04: duration string must encode at least 1 day — validated as a positive
// integer string (e.g. "2"). Free-form strings like "0 day" are rejected.
const durationField = z
	.string()
	.optional()
	.nullable()
	.refine((val) => {
		if (val == null || val === '') return true;
		const n = parseInt(val, 10);
		return !Number.isNaN(n) && n >= 1;
	}, 'Duration must be at least 1 day')
	.transform((v) => (v == null ? v : (sanitizeText(v) as string)));

export const createPackageSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2)
		.max(200)
		.transform((v) => sanitizeText(v) as string),
	tagline: safeOptText,
	description: safeOptText,
	image: z.string().optional().nullable(),
	duration: durationField,
	distance: z.string().optional().nullable(),
	groupSize: z.string().optional().nullable(),
	// PKG-03: positive price with upper bound
	price: z
		.number()
		.int()
		.min(1, 'Price must be greater than 0')
		.max(1_000_000_000, 'Price is too large'),
	trailId: z.string().optional().nullable(),
	sortOrder: z.number().int().optional().default(0),
	isActive: z.boolean().optional().default(true),
});

export const updatePackageSchema = createPackageSchema.partial();

export type CreatePackageRequest = z.infer<typeof createPackageSchema>;
export type UpdatePackageRequest = z.infer<typeof updatePackageSchema>;
