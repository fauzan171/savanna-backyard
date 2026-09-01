import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Textarea } from '@/react-app/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/react-app/components/ui/select';
import { FormField } from '@/react-app/components/ui/form-field';
import type { Customer, CustomerFormData } from '../types/customer.types';

const customerFormSchema = z.object({
	name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
	phone: z
		.string()
		.min(5, 'Nomor HP wajib diisi')
		.regex(/^[0-9+\-\s]+$/, 'Nomor HP hanya boleh berisi angka, +, spasi, atau strip'),
	email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
	address: z.string().optional(),
	identityType: z.enum(['KTP', 'SIM', 'Passport']).optional().or(z.literal('')),
	identityNumber: z.string().optional(),
	identityPhotoUrl: z.string().url('URL tidak valid').optional().or(z.literal('')),
	notes: z.string().optional(),
});

interface CustomerFormProps {
	customer?: Customer;
	onSubmit: (data: CustomerFormData) => Promise<void>;
	onCancel?: () => void;
	isLoading?: boolean;
}

export function CustomerForm({ customer, onSubmit, onCancel, isLoading }: CustomerFormProps) {
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setValue,
		watch,
		reset,
	} = useForm<CustomerFormData>({
		resolver: zodResolver(customerFormSchema),
		defaultValues: {
			name: '',
			phone: '',
			email: '',
			address: '',
			identityType: undefined,
			identityNumber: '',
			identityPhotoUrl: '',
			notes: '',
		},
	});

	// Reset form when customer changes (for edit mode)
	useEffect(() => {
		if (customer) {
			reset({
				name: customer.name,
				phone: customer.phone,
				email: customer.email ?? '',
				address: customer.address ?? '',
				identityType: customer.identityType ?? undefined,
				identityNumber: customer.identityNumber ?? '',
					identityPhotoUrl: customer.identityPhotoUrl ?? '',
				notes: customer.notes ?? '',
			});
		}
	}, [customer, reset]);

	const identityType = watch('identityType');

	const onFormSubmit = async (data: CustomerFormData) => {
		// Clean up empty strings to undefined
		const cleanData = {
			...data,
			email: data.email || undefined,
			address: data.address || undefined,
			identityType: data.identityType || undefined,
			identityNumber: data.identityNumber || undefined,
			identityPhotoUrl: data.identityPhotoUrl || undefined,
			notes: data.notes || undefined,
		};
		await onSubmit(cleanData);
	};

	return (
		<form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2">
				<FormField
					label="Nama"
					required
					error={errors.name?.message}
				>
					<Input
						{...register('name')}
						placeholder="Nama lengkap pelanggan"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>

				<FormField
					label="No. HP"
					required
					error={errors.phone?.message}
				>
					<Input
						{...register('phone')}
						placeholder="+6281234567890"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<FormField
					label="Email"
					error={errors.email?.message}
				>
					<Input
						{...register('email')}
						type="email"
						placeholder="john@example.com"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>

				<FormField label="Alamat" error={errors.address?.message}>
					<Input
						{...register('address')}
						placeholder="Jl. Sudirman No. 123, Jakarta"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>
			</div>

			<div className="border-t pt-4">
				<h3 className="mb-4 text-sm font-medium text-muted-foreground">Dokumen Identitas (Opsional)</h3>
				<div className="grid gap-4 md:grid-cols-2">
					<FormField label="Tipe Dokumen" error={errors.identityType?.message}>
						<Select
							value={identityType || ''}
							onValueChange={(value) => setValue('identityType', value as 'KTP' | 'SIM' | 'Passport' || undefined)}
							disabled={isLoading || isSubmitting}
						>
							<SelectTrigger>
								<SelectValue placeholder="Pilih tipe" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="KTP">KTP</SelectItem>
								<SelectItem value="SIM">SIM</SelectItem>
								<SelectItem value="Passport">Paspor</SelectItem>
							</SelectContent>
						</Select>
					</FormField>

					<FormField label="Nomor Dokumen" error={errors.identityNumber?.message}>
						<Input
							{...register('identityNumber')}
							placeholder="3171234567890001"
							disabled={isLoading || isSubmitting}
						/>
					</FormField>
				</div>

				<FormField
					label="Link Foto Dokumen"
					error={errors.identityPhotoUrl?.message}
					className="mt-4"
				>
					<Input
						{...register('identityPhotoUrl')}
						placeholder="https://..."
						disabled={isLoading || isSubmitting}
					/>
				</FormField>
			</div>

			<FormField label="Catatan" error={errors.notes?.message}>
				<Textarea
					{...register('notes')}
					placeholder="Catatan tambahan tentang pelanggan..."
					rows={3}
					disabled={isLoading || isSubmitting}
				/>
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
				<Button type="submit" disabled={isLoading || isSubmitting}>
					{isSubmitting ? 'Menyimpan...' : customer ? 'Update Pelanggan' : 'Buat Pelanggan'}
				</Button>
			</div>
		</form>
	);
}
