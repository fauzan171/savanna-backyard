import { useForm } from 'react-hook-form';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Textarea } from '@/react-app/components/ui/textarea';
import type { CreateReviewRequest } from '../api/reviews';

interface ReviewFormProps {
	initialData?: Partial<CreateReviewRequest>;
	onSubmit: (data: CreateReviewRequest) => void;
	onCancel: () => void;
	isLoading?: boolean;
}

export function ReviewForm({ initialData, onSubmit, onCancel, isLoading }: ReviewFormProps) {
	const { register, handleSubmit } = useForm<CreateReviewRequest>({
		defaultValues: {
			name: initialData?.name ?? '',
			location: initialData?.location ?? '',
			rating: initialData?.rating ?? 5,
			text: initialData?.text ?? '',
			avatar: initialData?.avatar ?? '',
			isPublished: initialData?.isPublished ?? false,
		},
	});

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div><label className="text-sm font-medium">Name</label><Input {...register('name', { required: true })} /></div>
				<div><label className="text-sm font-medium">Location</label><Input {...register('location')} /></div>
				<div><label className="text-sm font-medium">Rating (1-5)</label><Input type="number" min={1} max={5} {...register('rating', { valueAsNumber: true })} /></div>
				<div><label className="text-sm font-medium">Avatar Initials</label><Input {...register('avatar')} maxLength={3} /></div>
				<div className="col-span-2"><label className="text-sm font-medium">Review Text</label><Textarea {...register('text', { required: true, minLength: 10 })} rows={3} /><p className="text-xs text-muted-foreground">Minimum 10 characters.</p></div>
			</div>
			<div className="flex justify-end gap-2 pt-4">
				<Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
				<Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</Button>
			</div>
		</form>
	);
}
