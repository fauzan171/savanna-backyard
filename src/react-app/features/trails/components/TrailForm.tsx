import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Textarea } from '@/react-app/components/ui/textarea';
import type { CreateTrailRequest } from '../api/trails';

interface TrailFormProps {
	initialData?: any;
	onSubmit: (data: CreateTrailRequest) => void;
	onCancel: () => void;
	isLoading?: boolean;
	isNew?: boolean;
}

export function TrailForm({ initialData, onSubmit, onCancel, isLoading, isNew }: TrailFormProps) {
	const { register, handleSubmit, reset } = useForm<CreateTrailRequest>({
		defaultValues: {
			id: initialData?.id ?? '',
			name: initialData?.name ?? '',
			description: initialData?.description ?? '',
			terrain: initialData?.terrain ?? '',
			elevation: initialData?.elevation ?? '',
			difficulty: initialData?.difficulty ?? '',
			recommended: initialData?.recommended ?? '',
			image: initialData?.image ?? '',
			mapImage: initialData?.mapImage ?? '',
			blogOverview: initialData?.blogOverview ?? '',
			blogTips: initialData?.blogTips ?? '',
			blogGallery: initialData?.blogGallery ?? '',
			gpxUrl: initialData?.gpxUrl ?? '',
			estimatedDuration: initialData?.estimatedDuration ?? '',
			distance: initialData?.distance ?? '',
			bestTime: initialData?.bestTime ?? '',
			sortOrder: initialData?.sortOrder ?? 0,
			isActive: initialData?.isActive ?? true,
		},
	});

	// BUG#8: reset when editing a different record.
	useEffect(() => {
		if (initialData) {
			reset({
				id: initialData.id ?? '',
				name: initialData.name ?? '',
				description: initialData.description ?? '',
				terrain: initialData.terrain ?? '',
				elevation: initialData.elevation ?? '',
				difficulty: initialData.difficulty ?? '',
				recommended: initialData.recommended ?? '',
				image: initialData.image ?? '',
				mapImage: initialData.mapImage ?? '',
				blogOverview: initialData.blogOverview ?? '',
				blogTips: initialData.blogTips ?? '',
				blogGallery: initialData.blogGallery ?? '',
				gpxUrl: initialData.gpxUrl ?? '',
				estimatedDuration: initialData.estimatedDuration ?? '',
				distance: initialData.distance ?? '',
				bestTime: initialData.bestTime ?? '',
				sortOrder: initialData.sortOrder ?? 0,
				isActive: initialData.isActive ?? true,
			});
		}
	}, [initialData, reset]);

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			{/* Basic Info */}
			<div>
				<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Basic Info</h3>
				<div className="grid grid-cols-2 gap-4">
					{isNew && <div><label className="text-sm font-medium">Slug (ID)</label><Input {...register('id', { required: true })} placeholder="e.g. sea-of-sand" /></div>}
					<div><label className="text-sm font-medium">Name</label><Input {...register('name', { required: true })} /></div>
					<div className="col-span-2"><label className="text-sm font-medium">Description</label><Textarea {...register('description')} rows={2} /></div>
					<div><label className="text-sm font-medium">Terrain</label><Input {...register('terrain')} /></div>
					<div><label className="text-sm font-medium">Elevation</label><Input {...register('elevation')} /></div>
					<div><label className="text-sm font-medium">Difficulty</label><Input {...register('difficulty')} placeholder="Easy / Moderate / Hard / Extreme" /></div>
					<div><label className="text-sm font-medium">Recommended Bike</label><Input {...register('recommended')} /></div>
				</div>
			</div>

			{/* Images */}
			<div>
				<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Images</h3>
				<div className="grid grid-cols-2 gap-4">
					<div><label className="text-sm font-medium">Hero Image</label><Input {...register('image')} /></div>
					<div><label className="text-sm font-medium">Map Image</label><Input {...register('mapImage')} /></div>
				</div>
			</div>

			{/* Trail Details */}
			<div>
				<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Trail Details</h3>
				<div className="grid grid-cols-3 gap-4">
					<div><label className="text-sm font-medium">Estimated Duration</label><Input {...register('estimatedDuration')} /></div>
					<div><label className="text-sm font-medium">Distance</label><Input {...register('distance')} /></div>
					<div><label className="text-sm font-medium">Best Time</label><Input {...register('bestTime')} /></div>
				</div>
			</div>

			{/* Blog Content */}
			<div>
				<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Blog Content</h3>
				<div className="space-y-4">
					<div><label className="text-sm font-medium">Overview</label><Textarea {...register('blogOverview')} rows={4} /></div>
					<div><label className="text-sm font-medium">Tips</label><Textarea {...register('blogTips')} rows={4} /></div>
					<div><label className="text-sm font-medium">Gallery URLs (JSON array)</label><Textarea {...register('blogGallery')} rows={2} placeholder='["/images/trail/1.jpg", "/images/trail/2.jpg"]' /></div>
					<div><label className="text-sm font-medium">GPX URL</label><Input {...register('gpxUrl')} /></div>
				</div>
			</div>

			<div className="flex justify-end gap-2 pt-4">
				<Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
				<Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</Button>
			</div>
		</form>
	);
}
