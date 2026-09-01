import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Textarea } from '@/react-app/components/ui/textarea';
import { FormField } from '@/react-app/components/ui/form-field';
import type { CreatePricingRequest } from '../api/pricing';

// PRIC-02: prices must be positive (match backend DTO). The form collects
// features/notIncluded as comma-separated text, transformed to arrays on submit.
const pricingFormSchema = z.object({
	name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(200),
	description: z.string().max(1000).optional().nullable(),
	dailyPrice: z
		.number({ invalid_type_error: 'Harga harian wajib diisi' })
		.int('Harga harian harus berupa angka bulat')
		.min(1, 'Harga harian harus lebih dari 0')
		.max(1_000_000_000, 'Harga harian terlalu besar'),
	multiDayPrice: z
		.number({ invalid_type_error: 'Harga multi-hari wajib diisi' })
		.int('Harga multi-hari harus berupa angka bulat')
		.min(1, 'Harga multi-hari harus lebih dari 0')
		.max(1_000_000_000, 'Harga multi-hari terlalu besar'),
	featuresText: z.string().max(2000).optional().default(''),
	notIncludedText: z.string().max(2000).optional().default(''),
	highlighted: z.boolean().optional().default(false),
	icon: z.string().max(50).optional().nullable(),
	sortOrder: z.number().int().optional().default(0),
	isActive: z.boolean().optional().default(true),
});

type PricingFormData = z.infer<typeof pricingFormSchema>;

interface PricingFormProps {
	// ponytail: Omit features/notIncluded from CreatePricingRequest (string[]) and
	// widen to string|string[] — the API tier type stores them as a raw string,
	// while create/update sends arrays. toText() handles both shapes.
	initialData?: Partial<Omit<CreatePricingRequest, 'features' | 'notIncluded'>> & { features?: string[] | string; notIncluded?: string[] | string };
	onSubmit: (data: CreatePricingRequest) => void;
	onCancel: () => void;
	isLoading?: boolean;
}

export function PricingForm({ initialData, onSubmit, onCancel, isLoading }: PricingFormProps) {
	// ponytail: backend stores features/notIncluded as JSON.stringify([...]) in a text column;
	// normalize array OR JSON string to a comma-joined display string (PRIC-02).
	const toText = (v: unknown): string => {
		if (Array.isArray(v)) return v.join(', ');
		if (typeof v === 'string' && v.trim().startsWith('[')) {
			try { const parsed = JSON.parse(v); return Array.isArray(parsed) ? parsed.join(', ') : v; } catch { return v; }
		}
		return typeof v === 'string' ? v : '';
	};
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<PricingFormData>({
		resolver: zodResolver(pricingFormSchema),
		defaultValues: {
			name: initialData?.name ?? '',
			description: initialData?.description ?? '',
			dailyPrice: initialData?.dailyPrice ?? 0,
			multiDayPrice: initialData?.multiDayPrice ?? 0,
			featuresText: toText(initialData?.features),
			notIncludedText: toText(initialData?.notIncluded),
			highlighted: initialData?.highlighted ?? false,
			icon: initialData?.icon ?? '',
			sortOrder: initialData?.sortOrder ?? 0,
			isActive: initialData?.isActive ?? true,
		},
	});

	// BUG#8: reset when editing a different record.
	useEffect(() => {
		if (initialData) {
			reset({
				name: initialData.name ?? '',
				description: initialData.description ?? '',
				dailyPrice: initialData.dailyPrice ?? 0,
				multiDayPrice: initialData.multiDayPrice ?? 0,
				featuresText: initialData.features
					? typeof initialData.features === 'string'
						? initialData.features
						: initialData.features.join(', ')
					: '',
				notIncludedText: initialData.notIncluded
					? typeof initialData.notIncluded === 'string'
						? initialData.notIncluded
						: initialData.notIncluded.join(', ')
					: '',
				highlighted: initialData.highlighted ?? false,
				icon: initialData.icon ?? '',
				sortOrder: initialData.sortOrder ?? 0,
				isActive: initialData.isActive ?? true,
			});
		}
	}, [initialData, reset]);

	const processSubmit = (data: PricingFormData) => {
		onSubmit({
			name: data.name,
			description: data.description ?? null,
			dailyPrice: data.dailyPrice,
			multiDayPrice: data.multiDayPrice,
			features: data.featuresText
				? data.featuresText.split(',').map((s) => s.trim()).filter(Boolean)
				: [],
			notIncluded: data.notIncludedText
				? data.notIncludedText.split(',').map((s) => s.trim()).filter(Boolean)
				: [],
			highlighted: data.highlighted,
			icon: data.icon ?? null,
			sortOrder: data.sortOrder,
			isActive: data.isActive,
		});
	};

	return (
		<form onSubmit={handleSubmit(processSubmit)} className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div className="col-span-2">
					<FormField label="Nama Paket" required error={errors.name?.message}>
						<Input {...register('name')} />
					</FormField>
				</div>
				<div className="col-span-2">
					<FormField label="Deskripsi" error={errors.description?.message}>
						<Textarea {...register('description')} rows={2} />
					</FormField>
				</div>
				<FormField label="Harga Harian (IDR)" required error={errors.dailyPrice?.message}>
					<Input type="number" min={1} {...register('dailyPrice', { valueAsNumber: true })} />
				</FormField>
				<FormField label="Harga Multi-hari (IDR)" required error={errors.multiDayPrice?.message}>
					<Input type="number" min={1} {...register('multiDayPrice', { valueAsNumber: true })} />
				</FormField>
				<div className="col-span-2">
					<FormField
						label="Fasilitas (pisahkan dengan koma)"
						error={errors.featuresText?.message}
					>
						<Textarea
							{...register('featuresText')}
							rows={2}
							placeholder="Contoh: Rental motor, Helm standar, Asuransi dasar"
						/>
					</FormField>
				</div>
				<div className="col-span-2">
					<FormField
						label="Tidak Termasuk (pisahkan dengan koma)"
						error={errors.notIncludedText?.message}
					>
						<Textarea
							{...register('notIncludedText')}
							rows={2}
							placeholder="Contoh: Riding gear, Jas hujan"
						/>
					</FormField>
				</div>
				<FormField label="Ikon" error={errors.icon?.message}>
					<Input {...register('icon')} placeholder="Contoh: Bike" />
				</FormField>
				<FormField label="Urutan Tampil" error={errors.sortOrder?.message}>
					<Input type="number" {...register('sortOrder', { valueAsNumber: true })} />
				</FormField>
				<div className="flex items-center gap-2">
					<input type="checkbox" id="highlighted" {...register('highlighted')} />
					<label htmlFor="highlighted" className="text-sm font-medium">
						Unggulan
					</label>
				</div>
			</div>
			<div className="flex justify-end gap-2 pt-4">
				<Button type="button" variant="outline" onClick={onCancel}>
					Batal
				</Button>
				<Button type="submit" disabled={isLoading}>
					{isLoading ? 'Menyimpan...' : 'Simpan'}
				</Button>
			</div>
		</form>
	);
}
