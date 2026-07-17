import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/react-app/components/ui/select';
import { FormField } from '@/react-app/components/ui/form-field';
import { FileUpload } from '@/react-app/components/ui/file-upload';
import { Textarea } from '@/react-app/components/ui/textarea';
import { api } from '@/react-app/lib/api-client';
import type { Vehicle, VehicleFormData, VehicleType } from '../types/vehicle.types';

const vehicleFormSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters').max(100),
	plateNumber: z.string().min(3, 'Plate number is required'),
	type: z.enum(['TrailBike', 'StreetBike', 'Car', 'Jeep', 'Other']),
	brand: z.string().optional(),
	model: z.string().optional(),
	year: z.coerce.number().min(1990).max(2030).optional().or(z.literal('')),
	dailyRateIdr: z.coerce.number().min(0, 'Rate must be positive'),
	dailyRateUsd: z.coerce.number().min(0).optional().or(z.literal('')),
	description: z.string().max(1000).optional().or(z.literal('')),
	photoUrl: z.string().optional().or(z.literal('')),
});

interface VehicleFormProps {
	vehicle?: Vehicle;
	onSubmit: (data: VehicleFormData) => Promise<void>;
	onCancel?: () => void;
	isLoading?: boolean;
}

const vehicleTypes: { value: VehicleType; label: string }[] = [
	{ value: 'TrailBike', label: 'Trail Bike' },
	{ value: 'StreetBike', label: 'Street Bike' },
	{ value: 'Car', label: 'Car' },
	{ value: 'Jeep', label: 'Jeep' },
	{ value: 'Other', label: 'Other' },
];

export function VehicleForm({ vehicle, onSubmit, onCancel, isLoading }: VehicleFormProps) {
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setValue,
		watch,
		reset,
	} = useForm<VehicleFormData>({
		resolver: zodResolver(vehicleFormSchema),
		defaultValues: {
			name: '',
			plateNumber: '',
			type: 'TrailBike',
			brand: '',
			model: '',
			year: undefined,
			dailyRateIdr: 0,
			dailyRateUsd: undefined,
			description: '',
			photoUrl: '',
		},
	});

	const [uploadFile, setUploadFile] = useState<File[]>([]);
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState('');

	// Reset form when vehicle changes (for edit mode)
	useEffect(() => {
		if (vehicle) {
			reset({
				name: vehicle.name,
				plateNumber: vehicle.plateNumber,
				type: vehicle.type,
				brand: vehicle.brand ?? '',
				model: vehicle.model ?? '',
				year: vehicle.year ?? undefined,
				dailyRateIdr: vehicle.dailyRateIdr,
				dailyRateUsd: vehicle.dailyRateUsd ?? undefined,
				description: vehicle.description ?? '',
				photoUrl: vehicle.photoUrl ?? '',
			});
		}
	}, [vehicle, reset]);

	const vehicleType = watch('type');

	const onFormSubmit = async (data: VehicleFormData) => {
		// Upload file first if selected
		if (uploadFile.length > 0) {
			setUploading(true);
			setUploadError('');
			try {
				const result = await api.upload('/v1/uploads', uploadFile[0]);
				data.photoUrl = result.data.url;
			} catch (err) {
				setUploadError(err instanceof Error ? err.message : 'Upload failed');
				setUploading(false);
				return;
			}
			setUploading(false);
		}

		// Clean up empty strings to undefined
		const cleanData = {
			...data,
			brand: data.brand || undefined,
			model: data.model || undefined,
			year: data.year || undefined,
			dailyRateUsd: data.dailyRateUsd || undefined,
			description: data.description || undefined,
			photoUrl: data.photoUrl || undefined,
		};
		await onSubmit(cleanData);
	};

	return (
		<form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2">
				<FormField label="Name" required error={errors.name?.message}>
					<Input
						{...register('name')}
						placeholder="Honda CRF 250L"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>

				<FormField label="Plate Number" required error={errors.plateNumber?.message}>
					<Input
						{...register('plateNumber')}
						placeholder="B 1234 ABC"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<FormField label="Type" required error={errors.type?.message}>
					<Select
						value={vehicleType}
						onValueChange={(value) => setValue('type', value as VehicleType)}
						disabled={isLoading || isSubmitting}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select type" />
						</SelectTrigger>
						<SelectContent>
							{vehicleTypes.map((type) => (
								<SelectItem key={type.value} value={type.value}>
									{type.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FormField>

				<FormField label="Brand" error={errors.brand?.message}>
					<Input
						{...register('brand')}
						placeholder="Honda"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>

				<FormField label="Model" error={errors.model?.message}>
					<Input
						{...register('model')}
						placeholder="CRF 250L"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<FormField label="Year" error={errors.year?.message}>
					<Input
						{...register('year')}
						type="number"
						placeholder="2023"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>

				<FormField label="Daily Rate (IDR)" required error={errors.dailyRateIdr?.message}>
					<Input
						{...register('dailyRateIdr')}
						type="number"
						placeholder="450000"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>

				<FormField label="Daily Rate (USD)" error={errors.dailyRateUsd?.message}>
					<Input
						{...register('dailyRateUsd')}
						type="number"
						placeholder="29"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>
			</div>

			<FormField label="Photo">
				<FileUpload
					accept="image/jpeg,image/png,image/webp,image/gif"
					maxSize={5 * 1024 * 1024}
					value={uploadFile}
					onChange={(files) => {
						setUploadFile(files);
						setUploadError('');
					}}
					disabled={isLoading || isSubmitting || uploading}
					error={uploadError}
					size="sm"
				/>
				{watch('photoUrl') && !uploadFile.length && (
					<div className="mt-2 flex items-center gap-2">
						<img src={watch('photoUrl')!} alt="Current" className="size-12 rounded object-cover border" />
						<span className="text-xs text-muted-foreground">Current photo</span>
					</div>
				)}
			</FormField>

			<FormField label="Description" error={errors.description?.message}>
				<Textarea
					{...register('description')}
					placeholder="Describe this vehicle - condition, features, best use, etc. This will be shown on the landing page."
					rows={4}
					disabled={isLoading || isSubmitting}
				/>
				<p className="text-xs text-muted-foreground mt-1">
					Optional. Max 1000 characters. Shown on the public landing page vehicle detail.
				</p>
			</FormField>

			<div className="flex justify-end gap-3 pt-4">
				{onCancel && (
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={isLoading || isSubmitting}
					>
						Cancel
					</Button>
				)}
				<Button type="submit" disabled={isLoading || isSubmitting || uploading}>
					{uploading ? <><Loader2 className="size-4 mr-2 animate-spin" />Uploading...</> :
					 isSubmitting ? 'Saving...' : vehicle ? 'Update Vehicle' : 'Create Vehicle'}
				</Button>
			</div>
		</form>
	);
}
