import { z } from 'zod';

export const createEquipmentSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters'),
	category: z.enum(['Safety', 'Apparel', 'Accessories', 'Electronics']),
	description: z.string().nullable().optional(),
	dailyRateIdr: z.number().min(0, 'Daily rate must be >= 0'),
	image: z.string().nullable().optional(),
	stock: z.number().int().min(0).optional().default(0),
	isActive: z.boolean().optional().default(true),
	minRentalDays: z.number().int().min(1).optional().default(1),
	sortOrder: z.number().int().optional().default(0),
});
export const updateEquipmentSchema = createEquipmentSchema.partial();

export type CreateEquipmentRequest = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentRequest = z.infer<typeof updateEquipmentSchema>;
