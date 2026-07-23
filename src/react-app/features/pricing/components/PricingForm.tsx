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
	name: z.string().trim().min(2, 'Name must be at least 2 characters').max(200),
	description: z.string().max(1000).optional().nullable(),
	dailyPrice: z
		.number({ invalid_type_error: 'Daily price is required' })
		.int('Daily price must be a whole number')
		.min(1, 'Daily price must be greater than 0')
		.max(1_000_000_000, 'Daily price is too large'),
	multiDayPrice: z
		.number({ invalid_type_error: 'Multi-day price is required' })
		.int('Multi-day price must be a whole number')
		.min(1, 'Multi-day price must be greater than 0')
		.max(1_000_000_000, 'Multi-day price is too large'),
	featuresText: z.string().max(2000).optional().default(''),
	notIncludedText: z.string().max(2000).optional().default(''),
	highlighted: z.boolean().optional().default(false),
	icon: z.string().max(50).optional().nullable(),
	sortOrder: z.number().int().optional().default(0),
	isActive: z.boolean().optional().default(true),
});

type PricingFormData = z.infer<typeof pricingFormSchema>;

interface PricingFormProps {
	initialData?: Partial<CreatePricingRequest> & { features?: string[] | string; notIncluded?: string[] | string };
	onSubmit: (data: CreatePricingRequest) => void;
	onCancel: () => void;
	isLoading?: boolean;
}

export function PricingForm({ initialData, onSubmit, onCancel, isLoading }: PricingFormProps) {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<PricingFormData>({
		resolver: zodResolver(pricingFormSchema),
		defaultValues: {
			name: initialData?.name ?? '',
			description: initialData?.description ?? '',
			dailyPrice: initialData?.dailyPrice ?? 0,
			multiDayPrice: initialData?.multiDayPrice ?? 0,
			featuresText: initialData?.features
				? typeof initialData.features === 'string'
					? initialData.features
					: initialData.features.join(', ')
				: '',
			notIncludedText: initialData?.notIncluded
				? typeof initialData.notIncluded === 'string'
					? initialData.notIncluded
					: initialData.notIncluded.join(', ')
				: '',
			highlighted: initialData?.highlighted ?? false,
			icon: initialData?.icon ?? '',
			sortOrder: initialData?.sortOrder ?? 0,
			isActive: initialData?.isActive ?? true,
		},
	});

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
					<FormField label="Name" required error={errors.name?.message}>
						<Input {...register('name')} />
					</FormField>
				</div>
				<div className="col-span-2">
					<FormField label="Description" error={errors.description?.message}>
						<Textarea {...register('description')} rows={2} />
					</FormField>
				</div>
				<FormField label="Daily Price (IDR)" required error={errors.dailyPrice?.message}>
					<Input type="number" min={1} {...register('dailyPrice', { valueAsNumber: true })} />
				</FormField>
				<FormField label="Multi-Day Price (IDR)" required error={errors.multiDayPrice?.message}>
					<Input type="number" min={1} {...register('multiDayPrice', { valueAsNumber: true })} />
				</FormField>
				<div className="col-span-2">
					<FormField
						label="Features (comma-separated)"
						error={errors.featuresText?.message}
					>
						<Textarea
							{...register('featuresText')}
							rows={2}
							placeholder="e.g. Motorcycle rental, Standard helmet, Basic insurance"
						/>
					</FormField>
				</div>
				<div className="col-span-2">
					<FormField
						label="Not Included (comma-separated)"
						error={errors.notIncludedText?.message}
					>
						<Textarea
							{...register('notIncludedText')}
							rows={2}
							placeholder="e.g. Riding gear, Raincoat"
						/>
					</FormField>
				</div>
				<FormField label="Icon" error={errors.icon?.message}>
					<Input {...register('icon')} placeholder="e.g. Bike" />
				</FormField>
				<FormField label="Sort Order" error={errors.sortOrder?.message}>
					<Input type="number" {...register('sortOrder', { valueAsNumber: true })} />
				</FormField>
				<div className="flex items-center gap-2">
					<input type="checkbox" id="highlighted" {...register('highlighted')} />
					<label htmlFor="highlighted" className="text-sm font-medium">
						Highlighted
					</label>
				</div>
			</div>
			<div className="flex justify-end gap-2 pt-4">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={isLoading}>
					{isLoading ? 'Saving...' : 'Save'}
				</Button>
			</div>
		</form>
	);
}
