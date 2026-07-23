import { z } from 'zod';
import { sanitizeText } from '@/worker/core/schemas/sanitize';

// TRAIL-02: blogGallery is stored as text but is expected to be a JSON array of
// URLs. Reject malformed JSON early so the column never holds garbage. Accepts
// either a pre-serialized JSON string of a URL array, or null.
const galleryField = z
	.string()
	.optional()
	.nullable()
	.refine(
		(val) => {
			if (val == null || val === '') return true;
			try {
				const parsed = JSON.parse(val);
				return Array.isArray(parsed) && parsed.every((u) => typeof u === 'string');
			} catch {
				return false;
			}
		},
		{ message: 'Gallery URLs must be a valid JSON array of strings' },
	);

// Helper: optional nullable sanitized text
const safeOptText = z
	.string()
	.optional()
	.nullable()
	.transform((v) => (v == null ? v : (sanitizeText(v) as string)));

export const createTrailSchema = z.object({
	id: z.string().trim().min(2).max(100),
	name: z
		.string()
		.trim()
		.min(2)
		.max(200)
		.transform((v) => sanitizeText(v) as string),
	description: safeOptText,
	terrain: safeOptText,
	elevation: safeOptText,
	difficulty: safeOptText,
	recommended: safeOptText,
	image: z.string().optional().nullable(),
	mapImage: z.string().optional().nullable(),
	blogOverview: safeOptText,
	blogTips: safeOptText,
	blogGallery: galleryField,
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
