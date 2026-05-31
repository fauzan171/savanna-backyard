import { z } from 'zod';

export const createPackageSchema = z.object({
	name: z.string().min(2),
	tagline: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
	image: z.string().optional().nullable(),
	duration: z.string().optional().nullable(),
	distance: z.string().optional().nullable(),
	groupSize: z.string().optional().nullable(),
	price: z.number().int().min(0),
	trailId: z.string().optional().nullable(),
	sortOrder: z.number().int().optional().default(0),
	isActive: z.boolean().optional().default(true),
});

export const updatePackageSchema = createPackageSchema.partial();

export type CreatePackageRequest = z.infer<typeof createPackageSchema>;
export type UpdatePackageRequest = z.infer<typeof updatePackageSchema>;
