import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Textarea } from '@/react-app/components/ui/textarea';
import { FormField } from '@/react-app/components/ui/form-field';
import type { CreateReviewRequest } from '../api/reviews';

// Mirrors the backend reviews DTO (REV-02: rating 1-5 enforced client-side).
const reviewSchema = z.object({
	name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
	location: z.string().max(100).optional().nullable(),
	rating: z
		.number({ invalid_type_error: 'Rating is required' })
		.int('Rating must be a whole number')
		.min(1, 'Rating must be between 1 and 5')
		.max(5, 'Rating must be between 1 and 5'),
	text: z
		.string()
		.trim()
		.min(10, 'Review must be at least 10 characters')
		.max(2000, 'Review is too long'),
	avatar: z.string().max(10).optional().nullable(),
	isPublished: z.boolean().optional().default(false),
});

interface ReviewFormProps {
	initialData?: Partial<CreateReviewRequest>;
	onSubmit: (data: CreateReviewRequest) => void;
	onCancel: () => void;
	isLoading?: boolean;
}

export function ReviewForm({ initialData, onSubmit, onCancel, isLoading }: ReviewFormProps) {
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<CreateReviewRequest>({
		resolver: zodResolver(reviewSchema),
		defaultValues: {
			name: initialData?.name ?? '',
			location: initialData?.location ?? '',
			rating: initialData?.rating ?? 5,
			text: initialData?.text ?? '',
			avatar: initialData?.avatar ?? '',
			isPublished: initialData?.isPublished ?? false,
		},
	});

	// BUG#8: reset when editing a different record (defaultValues only applies on first mount).
	useEffect(() => {
		if (initialData) {
			reset({
				name: initialData.name ?? '',
				location: initialData.location ?? '',
				rating: initialData.rating ?? 5,
				text: initialData.text ?? '',
				avatar: initialData.avatar ?? '',
				isPublished: initialData.isPublished ?? false,
			});
		}
	}, [initialData, reset]);

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<FormField label="Name" required error={errors.name?.message}>
					<Input {...register('name')} />
				</FormField>
				<FormField label="Location" error={errors.location?.message}>
					<Input {...register('location')} />
				</FormField>
				<FormField label="Rating (1-5)" required error={errors.rating?.message}>
					<Input type="number" min={1} max={5} {...register('rating', { valueAsNumber: true })} />
				</FormField>
				<FormField label="Avatar Initials" error={errors.avatar?.message}>
					<Input {...register('avatar')} maxLength={3} />
				</FormField>
				<div className="col-span-2">
					<FormField label="Review Text" required error={errors.text?.message}>
						<Textarea {...register('text')} rows={3} />
					</FormField>
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
