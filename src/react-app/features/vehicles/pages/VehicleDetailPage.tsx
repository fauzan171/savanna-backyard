import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, User, CheckCircle, AlertCircle } from 'lucide-react';
import { format, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { Button } from '@/react-app/components/ui/button';
import { Badge } from '@/react-app/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';
import { Spinner } from '@/react-app/components/ui/spinner';
import { ConfirmationDialog } from '@/react-app/components/ui/confirmation-dialog';
import { toast } from '@/react-app/hooks/useToast';
import { extractApiError } from '@/react-app/lib/extract-error';
import { useVehicle, useUpdateVehicle, useUpdateVehicleStatus, useDeleteVehicle } from '../hooks/useVehicles';
import { useBookings } from '@/react-app/features/bookings/hooks/useBookings';
import { VehicleDetail } from '../components/VehicleDetail';
import { VehicleForm } from '../components/VehicleForm';
import type { VehicleFormData, VehicleStatus } from '../types/vehicle.types';

const formatCurrency = (amount: number) =>
	new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		minimumFractionDigits: 0,
	}).format(amount);

const formatDate = (date: string) => format(parseISO(date), 'd MMM yyyy');

export default function VehicleDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const { data: vehicle, isLoading, error } = useVehicle(id!);
	const updateMutation = useUpdateVehicle();
	const statusMutation = useUpdateVehicleStatus();
	const deleteMutation = useDeleteVehicle();

	// Fetch bookings for this vehicle
	const { data: bookingsData, isLoading: bookingsLoading } = useBookings({
		vehicleId: id,
		limit: 100,
	});

	const today = new Date();

	const activeAndUpcoming = (bookingsData?.items ?? []).filter(
		(b) => b.status === 'Active' || b.status === 'Confirmed' || b.status === 'Pending'
	);

	const activeBookings = activeAndUpcoming.filter((b) => b.status === 'Active');
	const upcomingBookings = activeAndUpcoming.filter(
		(b) => (b.status === 'Confirmed' || b.status === 'Pending') &&
			parseISO(b.startDate) >= today
	);

	const isAvailableToday = !activeAndUpcoming.some((b) => {
		try {
			return isWithinInterval(today, {
				start: parseISO(b.startDate),
				end: parseISO(b.endDate),
			});
		} catch {
			return false;
		}
	});

	const handleUpdate = async (formData: VehicleFormData) => {
		try {
			await updateMutation.mutateAsync({ id: id!, data: formData });
			setIsEditDialogOpen(false);
		} catch (error) {
			toast({
				title: 'Failed to update vehicle',
				description: extractApiError(error),
				variant: 'destructive',
			});
		}
	};

	const handleDelete = async () => {
		try {
			await deleteMutation.mutateAsync(id!);
			toast({ title: 'Vehicle deleted', description: 'The vehicle has been removed.' });
			navigate('/vehicles');
		} catch (error: unknown) {
			const message =
				(error as { error?: { message?: string } })?.error?.message ??
				'Failed to delete vehicle';
			toast({ title: 'Cannot delete vehicle', description: message, variant: 'destructive' });
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-16">
				<Spinner size="lg" />
			</div>
		);
	}

	if (error || !vehicle) {
		return (
			<div className="space-y-4">
				<Button variant="ghost" asChild>
					<Link to="/vehicles">
						<ArrowLeft className="size-4 mr-2" />
						Back to Vehicles
					</Link>
				</Button>
				<div className="rounded-lg border border-error/50 bg-error/10 p-6 text-center">
					<h2 className="text-lg font-semibold text-error">Vehicle Not Found</h2>
					<p className="text-muted-foreground mt-2">
						The vehicle you're looking for doesn't exist or has been deleted.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<Button variant="ghost" asChild>
				<Link to="/vehicles">
					<ArrowLeft className="size-4 mr-2" />
					Back to Vehicles
				</Link>
			</Button>

			<VehicleDetail
				vehicle={vehicle}
					onEdit={() => setIsEditDialogOpen(true)}
					onStatusChange={() => setIsStatusDialogOpen(true)}
					onDelete={() => setIsDeleteDialogOpen(true)}
			/>

			{/* Availability & Bookings Section */}
			<div className="rounded-lg border p-5 space-y-4">
				<h3 className="text-base font-semibold">Availability & Bookings</h3>

				{bookingsLoading ? (
					<div className="flex items-center justify-center py-8">
						<Spinner size="md" />
					</div>
				) : (
					<div className="space-y-4">
						{/* Status Banner */}
						<div className={`flex items-center gap-3 rounded-lg p-4 border ${
							isAvailableToday
								? 'bg-[hsl(var(--color-success-bg))] border-[hsl(var(--color-success-border))]'
								: 'bg-[hsl(var(--color-warning-bg))] border-[hsl(var(--color-warning-border))]'
						}`}>
							{isAvailableToday ? (
								<CheckCircle className="size-5 text-[hsl(var(--forest-green))] shrink-0" />
							) : (
								<AlertCircle className="size-5 text-[hsl(var(--color-warning))] shrink-0" />
							)}
							<div>
								<p className="font-medium text-sm">
									{isAvailableToday ? 'Available Today' : 'Currently Unavailable'}
								</p>
								<p className="text-xs text-muted-foreground">
									{isAvailableToday
										? `${vehicle.name} has no active bookings today`
										: `${vehicle.name} is currently on an active rental`}
								</p>
							</div>
						</div>

						{/* Active Bookings */}
						{activeBookings.length > 0 && (
							<div className="space-y-2">
								<h4 className="text-sm font-semibold flex items-center gap-2">
									<Clock className="size-4 text-[hsl(var(--status-active))]" />
									Active Rentals
								</h4>
								{activeBookings.map((booking) => {
									const daysRemaining = differenceInDays(parseISO(booking.endDate), today);
									return (
										<div key={booking.id} className="rounded-lg border border-[hsl(var(--color-success-border))] bg-[hsl(var(--color-success-bg))] p-3 space-y-2">
											<div className="flex items-center justify-between">
												<span className="font-mono text-sm font-medium text-[hsl(var(--primary))]">
													{booking.bookingNumber}
												</span>
												<Badge variant="outline" size="sm" className="text-[hsl(var(--status-active))] border-[hsl(var(--status-active))]">
													Active
												</Badge>
											</div>
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<User className="size-3.5" />
												<span>{booking.customer?.name ?? '-'}</span>
											</div>
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Calendar className="size-3.5" />
												<span>{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</span>
												<span className={`ml-auto text-xs font-medium ${
													daysRemaining <= 1 ? 'text-[hsl(var(--color-error))]' : 'text-muted-foreground'
												}`}>
													{daysRemaining <= 0 ? 'Overdue' : `${daysRemaining}d left`}
												</span>
											</div>
										</div>
									);
								})}
							</div>
						)}

						{/* Upcoming Bookings */}
						{upcomingBookings.length > 0 && (
							<div className="space-y-2">
								<h4 className="text-sm font-semibold flex items-center gap-2">
									<Calendar className="size-4 text-[hsl(var(--status-confirmed))]" />
									Upcoming Reservations
								</h4>
								{upcomingBookings.map((booking) => {
									const daysUntil = differenceInDays(parseISO(booking.startDate), today);
									return (
										<div key={booking.id} className="rounded-lg border p-3 space-y-2">
											<div className="flex items-center justify-between">
												<span className="font-mono text-sm font-medium text-[hsl(var(--primary))]">
													{booking.bookingNumber}
												</span>
												<Badge
													variant="outline"
													size="sm"
													className={booking.status === 'Confirmed'
														? 'text-[hsl(var(--status-confirmed))] border-[hsl(var(--status-confirmed))]'
														: 'text-[hsl(var(--status-pending))] border-[hsl(var(--status-pending))]'
													}
												>
													{booking.status}
												</Badge>
											</div>
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<User className="size-3.5" />
												<span>{booking.customer?.name ?? '-'}</span>
											</div>
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Calendar className="size-3.5" />
												<span>{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</span>
												<span className="ml-auto text-xs font-medium text-muted-foreground">
													in {daysUntil}d
												</span>
											</div>
											<div className="text-xs text-muted-foreground">
												{formatCurrency(booking.totalAmount)}
											</div>
										</div>
									);
								})}
							</div>
						)}

						{/* Empty State */}
						{activeAndUpcoming.length === 0 && (
							<div className="text-center py-6 text-muted-foreground text-sm">
								<Calendar className="size-8 mx-auto mb-2 opacity-30" />
								<p>No active or upcoming bookings</p>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Edit Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Edit Vehicle</DialogTitle>
					</DialogHeader>
					<VehicleForm
						vehicle={vehicle}
						onSubmit={handleUpdate}
						onCancel={() => setIsEditDialogOpen(false)}
						isLoading={updateMutation.isPending}
					/>
				</DialogContent>
			</Dialog>

			{/* Status Change Dialog */}
			<Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change Vehicle Status</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<p className="text-muted-foreground">
							Select the new status for this vehicle.
						</p>
							<div className="grid grid-cols-2 gap-2">
								{(['Available', 'Rented', 'Maintenance', 'Inactive'] as VehicleStatus[]).map((status) => (
									<Button
										key={status}
										variant={vehicle.status === status ? 'default' : 'outline'}
										onClick={async () => {
											try {
												await statusMutation.mutateAsync({ id: vehicle.id, status });
												setIsStatusDialogOpen(false);
											} catch (error) {
												toast({
													title: 'Failed to change status',
													description: extractApiError(error),
													variant: 'destructive',
												});
											}
										}}
										disabled={statusMutation.isPending}
									>
										{status}
									</Button>
								))}
							</div>
						</div>
					</DialogContent>
				</Dialog>

				{/* Delete Confirmation Dialog */}
				<ConfirmationDialog
					open={isDeleteDialogOpen}
					onOpenChange={setIsDeleteDialogOpen}
					title={`Delete ${vehicle.name}?`}
					description="This action cannot be undone. The vehicle will be permanently removed. Vehicles with active bookings or maintenance cannot be deleted."
					confirmLabel="Delete"
					variant="danger"
					onConfirm={handleDelete}
					isLoading={deleteMutation.isPending}
				/>
			</div>
		);
	}