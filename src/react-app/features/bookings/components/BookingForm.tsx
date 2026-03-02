import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
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
import { Badge } from '@/react-app/components/ui/badge';
import { Spinner } from '@/react-app/components/ui/spinner';
import {
	bookingFormSchema,
	type BookingFormData,
	type CreateAddonRequest,
} from '../types/booking.types';

interface BookingFormProps {
	onSubmit: (data: BookingFormData) => Promise<void>;
	onCancel?: () => void;
	isLoading?: boolean;
}

const addonTypes: Array<{ value: CreateAddonRequest['type']; label: string }> = [
	{ value: 'Tour_Guide', label: 'Tour Guide' },
	{ value: 'Safety_Gear', label: 'Safety Gear' },
	{ value: 'Pickup_Dropoff', label: 'Pickup/Dropoff' },
	{ value: 'Package', label: 'Package' },
	{ value: 'Other', label: 'Other' },
];

const formatCurrency = (amount: number, currency: 'IDR' | 'USD' = 'IDR') => {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
};

export function BookingForm({ onSubmit, onCancel, isLoading }: BookingFormProps) {
	const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
	const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
	const [addons, setAddons] = useState<CreateAddonRequest[]>([]);
	const [showAddonForm, setShowAddonForm] = useState(false);
	const [newAddon, setNewAddon] = useState<CreateAddonRequest>({
		type: 'Safety_Gear',
		description: '',
		amount: 0,
		isMandatory: false,
	});

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setValue,
		watch,
	} = useForm<BookingFormData>({
		resolver: zodResolver(bookingFormSchema),
		defaultValues: {
			customerId: '',
			vehicleId: '',
			startDate: new Date(),
			endDate: new Date(),
			paymentTerms: 'DP_Pickup',
			currency: 'IDR',
			notes: '',
		},
	});

	// Update form values when selections change
	const handleCustomerChange = (value: string | null) => {
		setSelectedCustomer(value);
		if (value) setValue('customerId', value);
	};

	const handleVehicleChange = (value: string | null) => {
		setSelectedVehicle(value);
		if (value) setValue('vehicleId', value);
	};

	// Customer options (mock - would come from API)
	const customerOptions: ComboboxOption[] = [
		{ value: '1', label: 'John Doe', sublabel: '+6281234567890' },
		{ value: '2', label: 'Jane Smith', sublabel: '+6289876543210' },
	];

	// Vehicle options (mock - would come from API)
	const vehicleOptions: ComboboxOption[] = [
		{ value: '1', label: 'Honda CRF 250L', sublabel: 'B 1234 ABC • Rp 450.000/day' },
		{ value: '2', label: 'Yamaha R15', sublabel: 'B 5678 XYZ • Rp 350.000/day' },
	];

	// Add-on handlers
	const handleAddAddon = () => {
		if (newAddon.description && newAddon.amount > 0) {
			setAddons([...addons, newAddon]);
			setNewAddon({
				type: 'Safety_Gear',
				description: '',
				amount: 0,
				isMandatory: false,
			});
			setShowAddonForm(false);
		}
	};

	const handleRemoveAddon = (index: number) => {
		setAddons(addons.filter((_, i) => i !== index));
	};

	const currency = watch('currency');

	const onFormSubmit = async (data: BookingFormData) => {
		await onSubmit({
			...data,
			addons: addons.length > 0 ? addons : undefined,
		});
	};

	return (
		<form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
			{/* Customer Selection */}
			<FormField label="Customer" required error={errors.customerId?.message}>
				<Combobox
					options={customerOptions}
					value={selectedCustomer}
					onChange={handleCustomerChange}
					placeholder="Select customer..."
					searchPlaceholder="Search customers..."
				/>
			</FormField>

			{/* Vehicle Selection */}
			<FormField label="Vehicle" required error={errors.vehicleId?.message}>
				<Combobox
					options={vehicleOptions}
					value={selectedVehicle}
					onChange={handleVehicleChange}
					placeholder="Select vehicle..."
					searchPlaceholder="Search vehicles..."
				/>
			</FormField>

			{/* Date Range */}
			<div className="grid gap-4 md:grid-cols-2">
				<FormField label="Start Date" required error={errors.startDate?.message}>
					<div className="relative">
						<Input
							type="date"
							{...register('startDate', { valueAsDate: true })}
							disabled={isLoading || isSubmitting}
						/>
						<CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
					</div>
				</FormField>

				<FormField label="End Date" required error={errors.endDate?.message}>
					<div className="relative">
						<Input
							type="date"
							{...register('endDate', { valueAsDate: true })}
							disabled={isLoading || isSubmitting}
						/>
						<CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
					</div>
				</FormField>
			</div>

			{/* Payment Terms & Currency */}
			<div className="grid gap-4 md:grid-cols-2">
				<FormField label="Payment Terms" required error={errors.paymentTerms?.message}>
					<Select
						value={watch('paymentTerms')}
						onValueChange={(value) =>
							setValue('paymentTerms', value as BookingFormData['paymentTerms'])
						}
						disabled={isLoading || isSubmitting}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select payment terms" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="DP_Pickup">DP + Pickup</SelectItem>
							<SelectItem value="Full_Upfront">Full Upfront</SelectItem>
							<SelectItem value="DP_After">DP + After Return</SelectItem>
							<SelectItem value="Flexible">Flexible</SelectItem>
						</SelectContent>
					</Select>
				</FormField>

				<FormField label="Currency" error={errors.currency?.message}>
					<Select
						value={watch('currency')}
						onValueChange={(value) =>
							setValue('currency', value as BookingFormData['currency'])
						}
						disabled={isLoading || isSubmitting}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select currency" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
							<SelectItem value="USD">USD - US Dollar</SelectItem>
						</SelectContent>
					</Select>
				</FormField>
			</div>

			{/* Add-ons Section */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-medium">Add-ons</h3>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setShowAddonForm(true)}
						disabled={isLoading || isSubmitting}
					>
						<Plus className="size-4 mr-2" />
						Add Add-on
					</Button>
				</div>

				{/* Add-ons List */}
				{addons.length > 0 && (
					<div className="space-y-2">
						{addons.map((addon, index) => (
							<div
								key={index}
								className="flex items-center justify-between p-3 border rounded-lg"
							>
								<div>
									<div className="font-medium">{addon.description}</div>
									<div className="text-sm text-muted-foreground">
										{addonTypes.find((t) => t.value === addon.type)?.label} •{' '}
										{formatCurrency(addon.amount, currency as 'IDR' | 'USD')}
										{addon.isMandatory && (
											<Badge variant="outline" size="sm" className="ml-2">
												Mandatory
											</Badge>
										)}
									</div>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => handleRemoveAddon(index)}
									disabled={isLoading || isSubmitting}
								>
									<Trash2 className="size-4" />
								</Button>
							</div>
						))}
					</div>
				)}

				{/* Add Add-on Form */}
				{showAddonForm && (
					<div className="p-4 border rounded-lg space-y-4 bg-muted/50">
						<FormField label="Type">
							<Select
								value={newAddon.type}
								onValueChange={(value) =>
									setNewAddon({ ...newAddon, type: value as CreateAddonRequest['type'] })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{addonTypes.map((type) => (
										<SelectItem key={type.value} value={type.value}>
											{type.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</FormField>

						<FormField label="Description" required>
							<Input
								value={newAddon.description}
								onChange={(e) =>
									setNewAddon({ ...newAddon, description: e.target.value })
								}
								placeholder="e.g., Helmet and riding jacket"
							/>
						</FormField>

						<FormField label="Amount" required>
							<Input
								type="number"
								value={newAddon.amount || ''}
								onChange={(e) =>
									setNewAddon({ ...newAddon, amount: Number(e.target.value) })
								}
								placeholder="0"
							/>
						</FormField>

						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="isMandatory"
								checked={newAddon.isMandatory}
								onChange={(e) =>
									setNewAddon({ ...newAddon, isMandatory: e.target.checked })
								}
								className="rounded border-input"
							/>
							<label htmlFor="isMandatory" className="text-sm">
								Mandatory add-on
							</label>
						</div>

						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setShowAddonForm(false)}
							>
								Cancel
							</Button>
							<Button
								type="button"
								size="sm"
								onClick={handleAddAddon}
								disabled={!newAddon.description || newAddon.amount <= 0}
							>
								Add
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* Notes */}
			<FormField label="Notes" error={errors.notes?.message}>
				<Textarea
					{...register('notes')}
					placeholder="Any special requests or notes..."
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
						Cancel
					</Button>
				)}
				<Button type="submit" disabled={isLoading || isSubmitting}>
					{isSubmitting ? (
						<>
							<Spinner size="sm" className="mr-2" />
							Creating...
						</>
					) : (
						'Create Booking'
					)}
				</Button>
			</div>
		</form>
	);
}
