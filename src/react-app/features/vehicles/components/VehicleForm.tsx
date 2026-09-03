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
import { api, ApiError } from '@/react-app/lib/api-client';
import { toast } from '@/react-app/hooks/useToast';
import type { Vehicle, VehicleFormData, VehicleType } from '../types/vehicle.types';
import { vehicleTypeLabels } from '@/react-app/lib/labels';

const vehicleFormSchema = z.object({
	name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
	plateNumber: z.string().min(3, 'Plat nomor wajib diisi'),
	type: z.enum(['TrailBike', 'StreetBike', 'Car', 'Jeep', 'Other']),
	brand: z.string().optional(),
	model: z.string().optional(),
	year: z.coerce.number().min(1990).max(2030).optional().or(z.literal('')),
	// TC-VEH-002: mirror server cap (vehicles.dto VEH-04: max Rp 50.000.000)
	dailyRateIdr: z.coerce.number().min(0, 'Tarif tidak boleh negatif').max(50_000_000, 'Tarif harian maksimal Rp 50.000.000'),
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
	{ value: 'TrailBike', label: vehicleTypeLabels.TrailBike },
	{ value: 'StreetBike', label: vehicleTypeLabels.StreetBike },
	{ value: 'Car', label: vehicleTypeLabels.Car },
	{ value: 'Jeep', label: vehicleTypeLabels.Jeep },
	{ value: 'Other', label: vehicleTypeLabels.Other },
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
				// TC-VEH-003: map server upload rejection codes to clear ID messages.
				let msg = 'Upload gagal';
				if (err instanceof ApiError && (err.code === 'INVALID_TYPE' || err.code === 'INVALID_FILE')) {
					msg = 'Hanya file gambar (JPEG, PNG, WebP, GIF) yang diizinkan';
				} else if (err instanceof ApiError && err.code === 'FILE_TOO_LARGE') {
					msg = 'Ukuran file melebihi 5MB';
				} else if (err instanceof Error) {
					msg = err.message;
				}
				setUploadError(msg);
				toast({ variant: 'destructive', title: 'Upload foto gagal', description: msg });
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
				<FormField label="Nama Kendaraan" required error={errors.name?.message}>
					<Input
						{...register('name')}
						placeholder="Honda CRF 250L"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>

				<FormField label="Plat Nomor" required error={errors.plateNumber?.message}>
					<Input
						{...register('plateNumber')}
						placeholder="B 1234 ABC"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<FormField label="Jenis Kendaraan" required error={errors.type?.message}>
					<Select
						value={vehicleType}
						onValueChange={(value) => setValue('type', value as VehicleType)}
						disabled={isLoading || isSubmitting}
					>
						<SelectTrigger>
							<SelectValue placeholder="Pilih jenis" />
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

				<FormField label="Merek" error={errors.brand?.message}>
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
				<FormField label="Tahun" error={errors.year?.message}>
					<Input
						{...register('year')}
						type="number"
						placeholder="2023"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>

				<FormField label="Tarif Harian (IDR)" required error={errors.dailyRateIdr?.message}>
					<Input
						{...register('dailyRateIdr')}
						type="number"
						placeholder="450000"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>

				<FormField label="Tarif Harian (USD)" error={errors.dailyRateUsd?.message}>
					<Input
						{...register('dailyRateUsd')}
						type="number"
						placeholder="29"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>
			</div>

			<FormField label="Foto">
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
						<img src={watch('photoUrl')!} alt="Foto saat ini" className="size-12 rounded object-cover border" />
						<span className="text-xs text-muted-foreground">Foto saat ini</span>
					</div>
				)}
			</FormField>

			<FormField label="Deskripsi" error={errors.description?.message}>
				<Textarea
					{...register('description')}
					placeholder="Tulis kondisi, fitur, dan penggunaan terbaik kendaraan. Deskripsi ini tampil di landing page."
					rows={4}
					disabled={isLoading || isSubmitting}
				/>
				<p className="text-xs text-muted-foreground mt-1">
					Opsional. Maksimal 1000 karakter. Tampil di detail kendaraan pada landing page.
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
						Batal
					</Button>
				)}
				<Button type="submit" disabled={isLoading || isSubmitting || uploading}>
					{uploading ? <><Loader2 className="size-4 mr-2 animate-spin" />Mengupload...</> :
					 isSubmitting ? 'Menyimpan...' : vehicle ? 'Update Kendaraan' : 'Buat Kendaraan'}
				</Button>
			</div>
		</form>
	);
}
