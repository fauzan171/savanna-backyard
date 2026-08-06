import { z } from 'zod';
import { sanitizeText } from '@/worker/core/schemas/sanitize';

export const createEquipmentSchema = z.object({
	name: z
		.string()
		.min(2, 'Name must be at least 2 characters')
		.transform((v) => sanitizeText(v) as string),
	category: z.enum(['Safety', 'Apparel', 'Accessories', 'Electronics']),
	description: z
		.string()
		.max(2000)
		.nullable()
		.optional()
		.transform((v) => (v == null ? v : (sanitizeText(v) as string))),
	// BND-03: cap matches vehicles.dto (Rp 50M). Equipment daily rates are far
	// below this; the bound exists to reject runaway magnitudes.
	dailyRateIdr: z
		.number()
		.min(0, 'Daily rate must be >= 0')
		.max(50_000_000, 'Daily rate cannot exceed Rp 50.000.000'),
	image: z.string().nullable().optional(),
	stock: z.number().int().min(0).optional().default(0),
	isActive: z.boolean().optional().default(true),
	minRentalDays: z.number().int().min(1).optional().default(1),
	sortOrder: z.number().int().optional().default(0),
});
export const updateEquipmentSchema = createEquipmentSchema.partial();

export type CreateEquipmentRequest = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentRequest = z.infer<typeof updateEquipmentSchema>;
