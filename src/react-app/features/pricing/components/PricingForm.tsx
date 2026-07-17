import { useForm } from 'react-hook-form';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Textarea } from '@/react-app/components/ui/textarea';
import type { CreatePricingRequest } from '../api/pricing';

interface PricingFormProps {
	initialData?: any;
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
	const { register, handleSubmit } = useForm<CreatePricingRequest & { featuresText: string; notIncludedText: string }>({
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

	const processSubmit = (data: any) => {
		onSubmit({
			...data,
			features: data.featuresText ? data.featuresText.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
			notIncluded: data.notIncludedText ? data.notIncludedText.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
		});
	};

	return (
		<form onSubmit={handleSubmit(processSubmit)} className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div className="col-span-2"><label className="text-sm font-medium">Name</label><Input {...register('name', { required: true })} /></div>
				<div className="col-span-2"><label className="text-sm font-medium">Description</label><Textarea {...register('description')} rows={2} /></div>
				<div><label className="text-sm font-medium">Daily Price (IDR)</label><Input type="number" {...register('dailyPrice', { valueAsNumber: true })} /></div>
				<div><label className="text-sm font-medium">Multi-Day Price (IDR)</label><Input type="number" {...register('multiDayPrice', { valueAsNumber: true })} /></div>
				<div className="col-span-2"><label className="text-sm font-medium">Features (comma-separated)</label><Textarea {...register('featuresText')} rows={2} placeholder="e.g. Motorcycle rental, Standard helmet, Basic insurance" /></div>
				<div className="col-span-2"><label className="text-sm font-medium">Not Included (comma-separated)</label><Textarea {...register('notIncludedText')} rows={2} placeholder="e.g. Riding gear, Raincoat" /></div>
				<div><label className="text-sm font-medium">Icon</label><Input {...register('icon')} placeholder="e.g. Bike" /></div>
				<div><label className="text-sm font-medium">Sort Order</label><Input type="number" {...register('sortOrder', { valueAsNumber: true })} /></div>
				<div className="flex items-center gap-2">
					<input type="checkbox" {...register('highlighted')} />
					<label className="text-sm font-medium">Highlighted</label>
				</div>
			</div>
			<div className="flex justify-end gap-2 pt-4">
				<Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
				<Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</Button>
			</div>
		</form>
	);
}
