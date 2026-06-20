import { z } from 'zod';
import { DEFAULT_CHECKLIST_ITEMS } from './checklists.types';

// Items schema: must have all default keys as boolean
const itemsSchema = z.record(z.string(), z.boolean()).refine(
	(items) => DEFAULT_CHECKLIST_ITEMS.every((key) => key in items),
	{ message: 'Semua item checklist wajib diisi' }
);

export const createChecklistSchema = z.object({
	bookingId: z.string().uuid(),
	type: z.enum(['pickup', 'return']),
	items: itemsSchema,
	kmReading: z.number().min(0, 'KM reading harus >= 0'),
	fuelLevel: z.number().min(0).max(100).optional().nullable(),
	photos: z.array(z.string()).optional().nullable(),
	notes: z.string().max(1000).optional().nullable(),
	damageNotes: z.string().max(1000).optional().nullable(),
});

export const updateChecklistSchema = z.object({
	items: itemsSchema.optional(),
	kmReading: z.number().min(0).optional(),
	fuelLevel: z.number().min(0).max(100).optional().nullable(),
	photos: z.array(z.string()).optional().nullable(),
	notes: z.string().max(1000).optional().nullable(),
	damageNotes: z.string().max(1000).optional().nullable(),
});

export type CreateChecklistRequest = z.infer<typeof createChecklistSchema>;
export type UpdateChecklistRequest = z.infer<typeof updateChecklistSchema>;
