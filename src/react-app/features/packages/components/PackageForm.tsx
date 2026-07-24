import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Textarea } from '@/react-app/components/ui/textarea';
import type { CreatePackageRequest } from '../api/packages';

interface PackageFormProps {
	initialData?: Partial<CreatePackageRequest>;
	onSubmit: (data: CreatePackageRequest) => void;
	onCancel: () => void;
	isLoading?: boolean;
}

export function PackageForm({ initialData, onSubmit, onCancel, isLoading }: PackageFormProps) {
	const { register, handleSubmit, reset } = useForm<CreatePackageRequest>({
		defaultValues: {
			name: initialData?.name ?? '',
			tagline: initialData?.tagline ?? '',
			description: initialData?.description ?? '',
			image: initialData?.image ?? '',
			duration: initialData?.duration ?? '',
			distance: initialData?.distance ?? '',
			groupSize: initialData?.groupSize ?? '',
			price: initialData?.price ?? 0,
			trailId: initialData?.trailId ?? '',
			sortOrder: initialData?.sortOrder ?? 0,
			isActive: initialData?.isActive ?? true,
		},
	});

	// BUG#8: reset when editing a different record.
	useEffect(() => {
		if (initialData) {
			reset({
				name: initialData.name ?? '',
				tagline: initialData.tagline ?? '',
				description: initialData.description ?? '',
				image: initialData.image ?? '',
				duration: initialData.duration ?? '',
				distance: initialData.distance ?? '',
				groupSize: initialData.groupSize ?? '',
				price: initialData.price ?? 0,
				trailId: initialData.trailId ?? '',
				sortOrder: initialData.sortOrder ?? 0,
				isActive: initialData.isActive ?? true,
			});
		}
	}, [initialData, reset]);

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div className="col-span-2">
					<label className="text-sm font-medium">Name</label>
					<Input {...register('name', { required: true })} />
				</div>
				<div className="col-span-2">
					<label className="text-sm font-medium">Tagline</label>
					<Input {...register('tagline')} />
				</div>
				<div className="col-span-2">
					<label className="text-sm font-medium">Description</label>
					<Textarea {...register('description')} rows={3} />
				</div>
				<div>
					<label className="text-sm font-medium">Duration</label>
					<Input {...register('duration')} placeholder="e.g. 1 day" />
				</div>
				<div>
					<label className="text-sm font-medium">Distance</label>
					<Input {...register('distance')} placeholder="e.g. 60 km" />
				</div>
				<div>
					<label className="text-sm font-medium">Group Size</label>
					<Input {...register('groupSize')} placeholder="e.g. 2-6 riders" />
				</div>
				<div>
					<label className="text-sm font-medium">Price (IDR)</label>
					<Input type="number" {...register('price', { valueAsNumber: true })} />
				</div>
				<div>
					<label className="text-sm font-medium">Trail ID</label>
					<Input {...register('trailId')} placeholder="e.g. sea-of-sand" />
				</div>
				<div>
					<label className="text-sm font-medium">Image URL</label>
					<Input {...register('image')} />
				</div>
				<div>
					<label className="text-sm font-medium">Sort Order</label>
					<Input type="number" {...register('sortOrder', { valueAsNumber: true })} />
				</div>
			</div>
			<div className="flex justify-end gap-2 pt-4">
				<Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
				<Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</Button>
			</div>
		</form>
	);
}
