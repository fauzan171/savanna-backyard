import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { FormField } from '@/react-app/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/react-app/components/ui/select';
import { Spinner } from '@/react-app/components/ui/spinner';
import { createEquipmentSchema, type CreateEquipmentRequest, EQUIPMENT_CATEGORY_LABELS, type EquipmentCategory } from '../types/equipment.types';

interface EquipmentFormProps {
	onSubmit: (data: CreateEquipmentRequest) => Promise<void>;
	onCancel?: () => void;
	isLoading?: boolean;
	defaultValues?: Partial<CreateEquipmentRequest>;
}

export function EquipmentForm({ onSubmit, onCancel, isLoading, defaultValues }: EquipmentFormProps) {
	const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<CreateEquipmentRequest>({
		resolver: zodResolver(createEquipmentSchema),
		defaultValues: {
			name: '',
			category: 'Safety',
			description: null,
			dailyRateIdr: 0,
			image: null,
			stock: 0,
			isActive: true,
			minRentalDays: 1,
			sortOrder: 0,
			...defaultValues,
		},
	});

	const onFormSubmit = async (data: CreateEquipmentRequest) => {
		await onSubmit(data);
	};

	return (
		<form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2">
				<FormField label="Name" required error={errors.name?.message}>
					<Input {...register('name')} placeholder="e.g. Helmet NHK" />
				</FormField>

				<FormField label="Category" required error={errors.category?.message}>
					<Select
						defaultValue={defaultValues?.category ?? 'Safety'}
						onValueChange={(val) => {
							const event = { target: { value: val } };
							register('category').onChange(event);
						}}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select category" />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(EQUIPMENT_CATEGORY_LABELS) as EquipmentCategory[]).map((cat) => (
								<SelectItem key={cat} value={cat}>
									{EQUIPMENT_CATEGORY_LABELS[cat]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FormField>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<FormField label="Daily Rate (IDR)" required error={errors.dailyRateIdr?.message}>
					<Input type="number" {...register('dailyRateIdr', { valueAsNumber: true })} placeholder="50000" />
				</FormField>

				<FormField label="Stock" required error={errors.stock?.message}>
					<Input type="number" {...register('stock', { valueAsNumber: true })} placeholder="10" />
				</FormField>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<FormField label="Min Rental Days" error={errors.minRentalDays?.message}>
					<Input type="number" {...register('minRentalDays', { valueAsNumber: true })} placeholder="1" />
				</FormField>

				<FormField label="Sort Order" error={errors.sortOrder?.message}>
					<Input type="number" {...register('sortOrder', { valueAsNumber: true })} placeholder="0" />
				</FormField>
			</div>

			<FormField label="Description" error={errors.description?.message}>
				<textarea
					{...register('description')}
					className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					placeholder="Equipment description..."
				/>
			</FormField>

			<FormField label="Image URL" error={errors.image?.message}>
				<Input {...register('image')} placeholder="https://..." />
			</FormField>

			<div className="flex justify-end gap-3 pt-4">
				{onCancel && (
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
				)}
				<Button type="submit" disabled={isLoading || isSubmitting}>
					{(isLoading || isSubmitting) && <Spinner size="sm" className="mr-2" />}
					{defaultValues ? 'Update Equipment' : 'Add Equipment'}
				</Button>
			</div>
		</form>
	);
}
