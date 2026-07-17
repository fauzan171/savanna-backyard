import type { BaseEntity } from '@/react-app/features/shared/types/api.types';
import { z } from 'zod';

export type EquipmentCategory = 'Safety' | 'Apparel' | 'Accessories' | 'Electronics';

export interface Equipment extends BaseEntity {
	name: string;
	category: EquipmentCategory;
	description: string | null;
	dailyRateIdr: number;
	image: string | null;
	stock: number;
	isActive: boolean;
	minRentalDays: number;
	sortOrder: number;
}

export interface EquipmentFilters {
	category?: EquipmentCategory;
	activeOnly?: boolean;
}

export const createEquipmentSchema = z.object({
	name: z.string().min(1, 'Name is required').max(200),
	category: z.enum(['Safety', 'Apparel', 'Accessories', 'Electronics']),
	description: z.string().max(1000).optional().nullable(),
	dailyRateIdr: z.number().min(0, 'Daily rate must be >= 0'),
	image: z.string().url().optional().nullable(),
	stock: z.number().int().min(0, 'Stock must be >= 0'),
	isActive: z.boolean().default(true),
	minRentalDays: z.number().int().min(1, 'Min rental days must be >= 1').default(1),
	sortOrder: z.number().int().default(0),
});

export const updateEquipmentSchema = createEquipmentSchema.partial();

export type CreateEquipmentRequest = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentRequest = z.infer<typeof updateEquipmentSchema>;

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
	Safety: 'Safety',
	Apparel: 'Apparel',
	Accessories: 'Accessories',
	Electronics: 'Electronics',
};

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}
