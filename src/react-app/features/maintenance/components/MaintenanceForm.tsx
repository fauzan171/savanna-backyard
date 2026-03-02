import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/react-app/components/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/react-app/components/ui/select';
import { Calendar } from '@/react-app/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/react-app/components/ui/popover';
import { FormField } from '@/react-app/components/ui/form-field';
import { cn } from '@/react-app/lib/utils';
import {
	maintenanceFormSchema,
	type MaintenanceFormData,
	type MaintenanceType,
} from '../types/maintenance.types';

interface MaintenanceFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: MaintenanceFormData) => void;
	isLoading?: boolean;
	initialData?: Partial<MaintenanceFormData>;
	vehicles?: Array<{ id: string; name: string; plateNumber: string }>;
}

const typeOptions: { value: MaintenanceType; label: string }[] = [
	{ value: 'Scheduled', label: 'Scheduled Maintenance' },
	{ value: 'Repair', label: 'Repair' },
	{ value: 'Damage', label: 'Damage' },
];

export function MaintenanceForm({
	open,
	onOpenChange,
	onSubmit,
	isLoading,
	initialData,
	vehicles = [],
}: MaintenanceFormProps) {
	const {
		register,
		handleSubmit,
		reset,
		setValue,
		watch,
		formState: { errors },
	} = useForm<MaintenanceFormData>({
		resolver: zodResolver(maintenanceFormSchema),
		defaultValues: {
			vehicleId: initialData?.vehicleId ?? '',
			type: initialData?.type ?? 'Scheduled',
			description: initialData?.description ?? '',
			cost: initialData?.cost,
			startDate: initialData?.startDate ?? new Date(),
			endDate: initialData?.endDate,
			bookingId: initialData?.bookingId,
			notes: initialData?.notes,
		},
	});

	const handleFormSubmit = (data: MaintenanceFormData) => {
		onSubmit(data);
	};

	const handleClose = () => {
		reset();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>
						{initialData ? 'Edit Maintenance' : 'New Maintenance'}
					</DialogTitle>
					<DialogDescription>
						{initialData
							? 'Update the maintenance record details.'
							: 'Create a new maintenance record for a vehicle.'}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
					<FormField label="Vehicle" error={errors.vehicleId?.message} required>
						<Select
							value={watch('vehicleId')}
							onValueChange={(value) => setValue('vehicleId', value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select a vehicle" />
							</SelectTrigger>
							<SelectContent>
								{vehicles.map((vehicle) => (
									<SelectItem key={vehicle.id} value={vehicle.id}>
										{vehicle.name} ({vehicle.plateNumber})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FormField>

					<FormField label="Type" error={errors.type?.message} required>
						<Select
							value={watch('type')}
							onValueChange={(value: MaintenanceType) => setValue('type', value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select type" />
							</SelectTrigger>
							<SelectContent>
								{typeOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FormField>

					<FormField label="Description" error={errors.description?.message} required>
						<textarea
							{...register('description')}
							className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="Describe the maintenance work..."
							rows={3}
						/>
					</FormField>

					<div className="grid grid-cols-2 gap-4">
						<FormField label="Start Date" error={errors.startDate?.message} required>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className={cn(
											'w-full justify-start text-left font-normal',
											!watch('startDate') && 'text-muted-foreground'
										)}
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{watch('startDate')
											? format(watch('startDate')!, 'PPP')
											: 'Pick a date'}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0">
									<Calendar
										mode="single"
										selected={watch('startDate')}
										onSelect={(date) => date && setValue('startDate', date)}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</FormField>

						<FormField label="End Date" error={errors.endDate?.message}>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className={cn(
											'w-full justify-start text-left font-normal',
											!watch('endDate') && 'text-muted-foreground'
										)}
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{watch('endDate')
											? format(watch('endDate')!, 'PPP')
											: 'Pick a date'}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0">
									<Calendar
										mode="single"
										selected={watch('endDate')}
										onSelect={(date) => setValue('endDate', date)}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</FormField>
					</div>

					<FormField label="Estimated Cost (IDR)" error={errors.cost?.message}>
						<input
							type="number"
							{...register('cost', { valueAsNumber: true })}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="0"
							min="0"
						/>
					</FormField>

					<FormField label="Notes" error={errors.notes?.message}>
						<textarea
							{...register('notes')}
							className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="Additional notes..."
							rows={2}
						/>
					</FormField>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={handleClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{initialData ? 'Update' : 'Create'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
