import { z } from 'zod';

// blogGallery arrives as a JSON-encoded string (textarea); must parse to an array when present.
const jsonGallery = z
	.string()
	.optional()
	.nullable()
	.refine(
		(val) => {
			if (val == null || val === '') return true;
			try {
				return Array.isArray(JSON.parse(val));
			} catch {
				return false;
			}
		},
		{ message: 'Gallery URLs must be a valid JSON array of strings' }
	);

export const createTrailSchema = z.object({
	id: z.string().min(2),
	name: z.string().min(2),
	description: z.string().optional().nullable(),
	terrain: z.string().optional().nullable(),
	elevation: z.string().optional().nullable(),
	difficulty: z.string().optional().nullable(),
	recommended: z.string().optional().nullable(),
	image: z.string().optional().nullable(),
	mapImage: z.string().optional().nullable(),
	blogOverview: z.string().optional().nullable(),
	blogTips: z.string().optional().nullable(),
	blogGallery: jsonGallery,
	gpxUrl: z.string().optional().nullable(),
	estimatedDuration: z.string().optional().nullable(),
	distance: z.string().optional().nullable(),
	bestTime: z.string().optional().nullable(),
	sortOrder: z.number().int().optional().default(0),
	isActive: z.boolean().optional().default(true),
});

export const updateTrailSchema = createTrailSchema.partial().omit({ id: true });

export type CreateTrailRequest = z.infer<typeof createTrailSchema>;
export type UpdateTrailRequest = z.infer<typeof updateTrailSchema>;
