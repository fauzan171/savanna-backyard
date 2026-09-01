import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Textarea } from '@/react-app/components/ui/textarea';
import { FormField } from '@/react-app/components/ui/form-field';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/react-app/components/ui/select';
import { Combobox, ComboboxOption } from '@/react-app/components/ui/combobox';
import { Spinner } from '@/react-app/components/ui/spinner';
import {
	paymentFormSchema,
	type PaymentFormData,
	type PaymentMethod,
} from '../types/payment.types';
import { paymentMethodLabels } from '@/react-app/lib/labels';

interface PaymentFormProps {
	onSubmit: (data: PaymentFormData) => Promise<void>;
	onCancel?: () => void;
	isLoading?: boolean;
	bookingOptions?: ComboboxOption[];
	defaultBookingId?: string;
}

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
	{ value: 'QRIS', label: 'QRIS' },
	{ value: 'Gateway', label: paymentMethodLabels.Gateway },
	{ value: 'Bank_Transfer', label: paymentMethodLabels.Bank_Transfer },
	{ value: 'Cash', label: paymentMethodLabels.Cash },
];

const formatCurrency = (amount: number, currency: 'IDR' | 'USD' = 'IDR') => {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
};

export function PaymentForm({
	onSubmit,
	onCancel,
	isLoading,
	bookingOptions = [],
	defaultBookingId,
}: PaymentFormProps) {
	const [selectedBooking, setSelectedBooking] = React.useState<string | null>(
		defaultBookingId || null
	);

	const {
		register,
		handleSubmit,
		control,
		formState: { errors, isSubmitting },
		setValue,
		watch,
	} = useForm<PaymentFormData>({
		resolver: zodResolver(paymentFormSchema),
		defaultValues: {
			bookingId: defaultBookingId || '',
			amount: 0,
			currency: 'IDR',
			method: 'QRIS',
			transactionReference: '',
			proofUrl: '',
			notes: '',
		},
	});

	const handleBookingChange = (value: string | null) => {
		setSelectedBooking(value);
		if (value) setValue('bookingId', value);
	};

	const amount = watch('amount');
	const currency = watch('currency');

	const onFormSubmit = async (data: PaymentFormData) => {
		await onSubmit({
			...data,
			transactionReference: data.transactionReference || undefined,
			proofUrl: data.proofUrl || undefined,
			notes: data.notes || undefined,
		});
	};

	return (
		<form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
			{/* Booking Selection */}
			{!defaultBookingId && (
				<FormField label="Booking" required error={errors.bookingId?.message}>
					<Combobox
						options={bookingOptions}
						value={selectedBooking}
						onChange={handleBookingChange}
						placeholder="Pilih booking..."
						searchPlaceholder="Cari booking..."
					/>
				</FormField>
			)}

			{/* Amount & Currency */}
			<div className="grid gap-4 md:grid-cols-2">
				<FormField label="Nominal" required error={errors.amount?.message}>
					<Input
						type="number"
						{...register('amount', { valueAsNumber: true })}
						placeholder="0"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>

				<FormField label="Mata Uang" error={errors.currency?.message}>
					<Controller
						name="currency"
						control={control}
						render={({ field }) => (
							<Select
								value={field.value}
								onValueChange={field.onChange}
								disabled={isLoading || isSubmitting}
							>
								<SelectTrigger>
									<SelectValue placeholder="Pilih mata uang" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="IDR">IDR - Rupiah Indonesia</SelectItem>
									<SelectItem value="USD">USD - Dolar AS</SelectItem>
								</SelectContent>
							</Select>
						)}
					/>
				</FormField>
			</div>

			{/* Amount Preview */}
			{amount > 0 && (
				<div className="p-3 bg-muted/50 rounded-lg">
					<div className="text-sm text-muted-foreground">Nominal Pembayaran</div>
					<div className="text-xl font-semibold">
						{formatCurrency(amount, currency as 'IDR' | 'USD')}
					</div>
				</div>
			)}

			{/* Payment Method */}
			<FormField label="Metode Pembayaran" required error={errors.method?.message}>
				<Controller
					name="method"
					control={control}
					render={({ field }) => (
						<Select
							value={field.value}
							onValueChange={field.onChange}
							disabled={isLoading || isSubmitting}
						>
							<SelectTrigger>
								<SelectValue placeholder="Pilih metode pembayaran" />
							</SelectTrigger>
							<SelectContent>
								{paymentMethods.map((method) => (
									<SelectItem key={method.value} value={method.value}>
										{method.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				/>
			</FormField>

			{/* Transaction Reference */}
			<FormField label="Referensi Transaksi" error={errors.transactionReference?.message}>
				<Input
					{...register('transactionReference')}
					placeholder="Contoh: TXN123456789"
					disabled={isLoading || isSubmitting}
				/>
			</FormField>

			{/* Proof URL */}
			<FormField label="Link Bukti Pembayaran" error={errors.proofUrl?.message}>
				<Input
					{...register('proofUrl')}
					type="url"
					placeholder="https://..."
					disabled={isLoading || isSubmitting}
				/>
			</FormField>

			{/* Notes */}
			<FormField label="Catatan" error={errors.notes?.message}>
				<Textarea
					{...register('notes')}
					placeholder="Catatan tambahan..."
					rows={3}
					disabled={isLoading || isSubmitting}
				/>
			</FormField>

			{/* Form Actions */}
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
					{isSubmitting ? (
						<>
							<Spinner size="sm" className="mr-2" />
							Menyimpan...
						</>
					) : (
						'Catat Pembayaran'
					)}
				</Button>
			</div>
		</form>
	);
}
