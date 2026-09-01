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
	name: z.string().min(1, 'Nama wajib diisi').max(200),
	category: z.enum(['Safety', 'Apparel', 'Accessories', 'Electronics']),
	description: z.string().max(1000).optional().nullable(),
	dailyRateIdr: z.number().min(0, 'Tarif harian tidak boleh negatif'),
	image: z.string().url().optional().nullable(),
	stock: z.number().int().min(0, 'Stok tidak boleh negatif'),
	isActive: z.boolean().default(true),
	minRentalDays: z.number().int().min(1, 'Minimal hari rental harus 1 atau lebih').default(1),
	sortOrder: z.number().int().default(0),
});

export const updateEquipmentSchema = createEquipmentSchema.partial();

export type CreateEquipmentRequest = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentRequest = z.infer<typeof updateEquipmentSchema>;

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
	Safety: 'Keselamatan',
	Apparel: 'Pakaian',
	Accessories: 'Aksesori',
	Electronics: 'Elektronik',
};

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}
