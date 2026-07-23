import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/react-app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';
import { Spinner } from '@/react-app/components/ui/spinner';
import { ConfirmationDialog } from '@/react-app/components/ui/confirmation-dialog';
import { toast } from '@/react-app/hooks/useToast';
import { extractApiError } from '@/react-app/lib/extract-error';
import { FormField } from '@/react-app/components/ui/form-field';
import { Calendar } from '@/react-app/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/react-app/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/react-app/components/ui/select';
import { Combobox, type ComboboxOption } from '@/react-app/components/ui/combobox';
import { cn } from '@/react-app/lib/utils';
import { useLead, useUpdateLead, useConvertToBooking, useDeleteLead } from '../hooks/useLeads';
import { useVehicles } from '@/react-app/features/vehicles/hooks/useVehicles';
import { LeadDetail } from '../components/LeadDetail';
import { LeadForm } from '../components/LeadForm';
import type { LeadFormData, ConvertToBookingRequest } from '../types/lead.types';

const convertSchema = z.object({
	vehicleId: z.string().min(1, 'Vehicle is required'),
	startDate: z.date({ required_error: 'Start date is required' }),
	endDate: z.date({ required_error: 'End date is required' }),
	paymentTerms: z.enum(['DP_Pickup', 'Full_Upfront', 'DP_After', 'Flexible']),
	notes: z.string().optional(),
}).refine((data) => data.endDate >= data.startDate, {
	message: 'End date must be on or after start date',
	path: ['endDate'],
});

type ConvertFormData = z.infer<typeof convertSchema>;

const formatCurrency = (amount: number) =>
	new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		minimumFractionDigits: 0,
	}).format(amount);

export default function LeadDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

	const { data: lead, isLoading, error } = useLead(id!);
	const updateMutation = useUpdateLead();
	const convertMutation = useConvertToBooking(id!);
	const deleteMutation = useDeleteLead();
	const { data: vehiclesData } = useVehicles({ limit: 100, status: 'Available' });

	const vehicleOptions: ComboboxOption[] = vehiclesData?.items?.map((v) => ({
		value: v.id,
		label: v.name,
		sublabel: `${v.plateNumber} • ${formatCurrency(v.dailyRateIdr)}/day`,
	})) ?? [];

	const {
		handleSubmit,
		formState: { errors, isSubmitting },
		setValue,
		watch,
		reset,
	} = useForm<ConvertFormData>({
		resolver: zodResolver(convertSchema),
		defaultValues: { vehicleId: '', paymentTerms: 'DP_Pickup' },
	});

	const handleUpdate = async (formData: LeadFormData) => {
		try {
			await updateMutation.mutateAsync({ id: id!, data: formData });
			setIsEditDialogOpen(false);
		} catch (error) {
			toast({
				title: 'Failed to update lead',
				description: extractApiError(error),
				variant: 'destructive',
			});
		}
	};

	const handleDelete = async () => {
		try {
			await deleteMutation.mutateAsync(id!);
			toast({ title: 'Lead deleted', description: 'The lead has been removed.' });
			navigate('/leads');
		} catch (error: unknown) {
			const message =
				(error as { error?: { message?: string } })?.error?.message ??
				'Failed to delete lead';
			toast({ title: 'Cannot delete lead', description: message, variant: 'destructive' });
		}
	};

	const handleConvert = async (data: ConvertFormData) => {
		try {
			const payload: ConvertToBookingRequest = {
				customerId: lead!.id,
				vehicleId: data.vehicleId,
				startDate: format(data.startDate, 'yyyy-MM-dd'),
				endDate: format(data.endDate, 'yyyy-MM-dd'),
				paymentTerms: data.paymentTerms,
				notes: data.notes,
			};
			const result = await convertMutation.mutateAsync(payload);
			setIsConvertDialogOpen(false);
			reset();
			setSelectedVehicle(null);
			if (result?.data?.booking?.id) {
				navigate(`/bookings/${result.data.booking.id}`);
			}
		} catch (error) {
			toast({
				title: 'Failed to convert lead',
				description: extractApiError(error),
				variant: 'destructive',
			});
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-16">
				<Spinner size="lg" />
			</div>
		);
	}

	if (error || !lead) {
		return (
			<div className="space-y-4">
				<Button variant="ghost" asChild>
					<Link to="/leads">
						<ArrowLeft className="size-4 mr-2" />
						Back to Leads
					</Link>
				</Button>
				<div className="rounded-lg border border-error/50 bg-error/10 p-6 text-center">
					<h2 className="text-lg font-semibold text-error">Lead Not Found</h2>
					<p className="text-muted-foreground mt-2">
						The lead you're looking for doesn't exist or has been deleted.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<Button variant="ghost" asChild>
				<Link to="/leads">
					<ArrowLeft className="size-4 mr-2" />
					Back to Leads
				</Link>
			</Button>

		<LeadDetail
			lead={lead}
			onEdit={() => setIsEditDialogOpen(true)}
			onConvert={() => setIsConvertDialogOpen(true)}
			onDelete={() => setIsDeleteDialogOpen(true)}
			/>

			{/* Edit Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Edit Lead</DialogTitle>
					</DialogHeader>
					<LeadForm
						lead={lead}
						onSubmit={handleUpdate}
						onCancel={() => setIsEditDialogOpen(false)}
						isLoading={updateMutation.isPending}
					/>	
				</DialogContent>
			</Dialog>

			{/* Convert to Booking Dialog */}
			<Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Convert Lead to Booking</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground -mt-1">
						Converting <strong className="text-foreground">{lead.name}</strong> — pilih kendaraan dan tanggal rental.
					</p>

					<form onSubmit={handleSubmit(handleConvert)} className="space-y-5">
						<FormField label="Vehicle" required error={errors.vehicleId?.message}>
							<Combobox
								options={vehicleOptions}
								value={selectedVehicle}
								onChange={(value) => {
									setSelectedVehicle(value);
									if (value) setValue('vehicleId', value);
								}}
								placeholder="Select vehicle..."
								searchPlaceholder="Search vehicles..."
							/>
						</FormField>

						<div className="grid gap-4 md:grid-cols-2">
							<FormField label="Start Date" required error={errors.startDate?.message}>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											type="button"
											variant="outline"
											className={cn('w-full justify-start text-left font-normal', !watch('startDate') && 'text-muted-foreground')}
											disabled={convertMutation.isPending || isSubmitting}
										>
											<CalendarIcon className="mr-2 size-4" />
											{watch('startDate') ? format(watch('startDate'), 'dd MMM yyyy') : 'Pick a date'}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={watch('startDate')}
											onSelect={(date) => date && setValue('startDate', date)}
											// initialFocus
										/>
									</PopoverContent>
								</Popover>
							</FormField>

							<FormField label="End Date" required error={errors.endDate?.message}>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											type="button"
											variant="outline"
											className={cn('w-full justify-start text-left font-normal', !watch('endDate') && 'text-muted-foreground')}
											disabled={convertMutation.isPending || isSubmitting}
										>
											<CalendarIcon className="mr-2 size-4" />
											{watch('endDate') ? format(watch('endDate'), 'dd MMM yyyy') : 'Pick a date'}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={watch('endDate')}
											onSelect={(date) => date && setValue('endDate', date)}
											// initialFocus
										/>
									</PopoverContent>
								</Popover>
							</FormField>
						</div>

						<FormField label="Payment Terms" required error={errors.paymentTerms?.message}>
							<Select
								value={watch('paymentTerms')}
								onValueChange={(value) => setValue('paymentTerms', value as ConvertFormData['paymentTerms'])}
								disabled={convertMutation.isPending || isSubmitting}
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

						<div className="flex justify-end gap-3 pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setIsConvertDialogOpen(false);
									reset();
									setSelectedVehicle(null);
								}}
								disabled={convertMutation.isPending || isSubmitting}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={convertMutation.isPending || isSubmitting}>
								{isSubmitting || convertMutation.isPending ? (
									<><Spinner size="sm" className="mr-2" />Converting...</>
								) : (
									'Convert to Booking'
								)}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<ConfirmationDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
				title={`Delete lead ${lead.name}?`}
				description="This action cannot be undone. The lead and its notes will be permanently removed. Converted leads cannot be deleted."
				confirmLabel="Delete"
				variant="danger"
				onConfirm={handleDelete}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}