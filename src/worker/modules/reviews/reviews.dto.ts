import { z } from 'zod';

export const createReviewSchema = z.object({
	name: z.string().min(2),
	location: z.string().optional().nullable(),
	rating: z.number().int().min(1).max(5),
	text: z.string().min(10),
	avatar: z.string().optional().nullable(),
	isPublished: z.boolean().optional().default(false),
});

export const updateReviewSchema = createReviewSchema.partial();

export type CreateReviewRequest = z.infer<typeof createReviewSchema>;
export type UpdateReviewRequest = z.infer<typeof updateReviewSchema>;
