import { z } from 'zod';
import { sanitizeText } from '@/worker/core/schemas/sanitize';

const safeOptText = z
	.string()
	.optional()
	.nullable()
	.transform((v) => (v == null ? v : (sanitizeText(v) as string)));

export const createReviewSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2)
		.max(100)
		.transform((v) => sanitizeText(v) as string),
	location: safeOptText,
	// REV-02: rating restricted to 1-5 (already correct, kept explicit)
	rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
	text: z
		.string()
		.trim()
		.min(10, 'Review must be at least 10 characters')
		.max(2000)
		.transform((v) => sanitizeText(v) as string),
	avatar: z.string().optional().nullable(),
	isPublished: z.boolean().optional().default(false),
});

export const updateReviewSchema = createReviewSchema.partial();

export type CreateReviewRequest = z.infer<typeof createReviewSchema>;
export type UpdateReviewRequest = z.infer<typeof updateReviewSchema>;
