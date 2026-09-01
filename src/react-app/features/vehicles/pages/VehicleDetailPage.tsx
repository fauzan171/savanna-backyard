import { useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, User, CheckCircle, AlertCircle, ExternalLink, Bike, Gauge, ClipboardCheck } from 'lucide-react';
import { format, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { Button } from '@/react-app/components/ui/button';
import { Badge } from '@/react-app/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';
import { Spinner } from '@/react-app/components/ui/spinner';
import { ConfirmationDialog } from '@/react-app/components/ui/confirmation-dialog';
import { toast } from '@/react-app/hooks/useToast';
import { extractApiError } from '@/react-app/lib/extract-error';
import { useVehicle, useUpdateVehicle, useUpdateVehicleStatus, useDeleteVehicle, useVehicleCalendar } from '../hooks/useVehicles';
import { useBookings } from '@/react-app/features/bookings/hooks/useBookings';
import { VehicleDetail } from '../components/VehicleDetail';
import { VehicleForm } from '../components/VehicleForm';
import { VehicleQrCard } from '../components/VehicleQrCard';
import type { VehicleFormData, VehicleStatus } from '../types/vehicle.types';
import { labelFromMap, vehicleStatusLabels } from '@/react-app/lib/labels';

const formatCurrency = (amount: number) =>
	new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		minimumFractionDigits: 0,
	}).format(amount);

const formatDate = (date: string) => format(parseISO(date), 'd MMM yyyy');
const statusLabel = (status: string) => labelFromMap(vehicleStatusLabels, status);

export default function VehicleDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const { data: vehicle, isLoading, error } = useVehicle(id!);
	const updateMutation = useUpdateVehicle();
	const statusMutation = useUpdateVehicleStatus();
	const deleteMutation = useDeleteVehicle();
	const currentMonth = format(new Date(), 'yyyy-MM');
	const scannedFromQr = searchParams.get('fromScan') === '1';
	const scannedBookingId = searchParams.get('bookingId');

	// Fetch bookings for this vehicle
	const { data: bookingsData, isLoading: bookingsLoading } = useBookings({
		vehicleId: id,
		limit: 100,
	});
	const { data: calendarData, isLoading: calendarLoading } = useVehicleCalendar(id!, currentMonth);

	const today = new Date();

	const activeAndUpcoming = (bookingsData?.items ?? []).filter(
		(b) => b.status === 'Active' || b.status === 'Confirmed' || b.status === 'Pending'
	);

	const activeBookings = activeAndUpcoming.filter((b) => b.status === 'Active');
	const linkedBooking = (bookingsData?.items ?? []).find((booking) => booking.id === scannedBookingId);
	const upcomingBookings = activeAndUpcoming.filter(
		(b) => (b.status === 'Confirmed' || b.status === 'Pending') &&
			parseISO(b.startDate) >= today
	);
	const bookedDaysThisMonth = (calendarData?.calendar ?? []).filter(
		(day) => day.status === 'booked'
	).length;
	const nextScheduledBooking = [...upcomingBookings]
		.sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime())[0];

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
					title: 'Gagal memperbarui kendaraan',
				description: extractApiError(error),
				variant: 'destructive',
			});
		}
	};

	const handleDelete = async () => {
		try {
			await deleteMutation.mutateAsync(id!);
			toast({ title: 'Kendaraan dihapus', description: 'Kendaraan sudah dihapus.' });
			navigate('/vehicles');
		} catch (error: unknown) {
			const message =
				(error as { error?: { message?: string } })?.error?.message ??
				'Gagal menghapus kendaraan';
			toast({ title: 'Kendaraan tidak bisa dihapus', description: message, variant: 'destructive' });
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
						Kembali ke Kendaraan
					</Link>
				</Button>
				<div className="rounded-lg border border-error/50 bg-error/10 p-6 text-center">
					<h2 className="text-lg font-semibold text-error">Kendaraan Tidak Ditemukan</h2>
					<p className="text-muted-foreground mt-2">
						Kendaraan tidak tersedia atau sudah dihapus.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-5 pb-6">
			<Button variant="ghost" className="px-0 sm:px-3" asChild>
				<Link to="/vehicles">
					<ArrowLeft className="size-4 mr-2" />
					Kembali ke Kendaraan
				</Link>
			</Button>

			{scannedFromQr && (
				<div className="rounded-lg border border-[hsl(var(--color-success-border))] bg-[hsl(var(--color-success-bg))] p-4 shadow-sm">
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div className="flex items-start gap-3">
							<div className="rounded-full bg-background/70 p-2">
								<Bike className="size-5 text-[hsl(var(--forest-green))]" />
							</div>
							<div>
								<p className="font-semibold">Hasil scan kendaraan</p>
								<p className="text-sm text-muted-foreground">
									Cek identitas, status, KM, kondisi motor, dan booking terkait dari halaman ini.
								</p>
							</div>
						</div>
						<div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
							{linkedBooking && (
								<Button asChild size="sm" className="h-10">
									<Link to={`/bookings/${linkedBooking.id}`}>
										<ExternalLink className="mr-2 size-4" />
										Buka Booking Terkait
									</Link>
								</Button>
							)}
							<Button variant="outline" size="sm" className="h-10" asChild>
								<Link to="/calendar">
									<Calendar className="mr-2 size-4" />
									Buka Kalender
								</Link>
							</Button>
						</div>
					</div>
				</div>
			)}

			<VehicleDetail
				vehicle={vehicle}
					onEdit={() => setIsEditDialogOpen(true)}
					onStatusChange={() => setIsStatusDialogOpen(true)}
					onDelete={() => setIsDeleteDialogOpen(true)}
			/>

			{/* QR code generation */}
			<div className="rounded-lg border bg-card p-4 sm:p-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h3 className="text-base font-semibold">QR Pickup Kendaraan</h3>
					<p className="text-sm text-muted-foreground">
						Cetak dan tempel QR ini pada motor. Customer dan staff dapat scan untuk cek kondisi atau pickup.
					</p>
				</div>
				<VehicleQrCard vehicleId={vehicle.id} vehicleName={vehicle.name} />
			</div>

			<div className="rounded-lg border bg-card p-4 sm:p-5 space-y-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h3 className="text-base font-semibold">Operasional & Jadwal</h3>
						<p className="text-sm text-muted-foreground">
							Ringkasan cepat untuk staf lapangan: status armada, KM, booking aktif, dan jadwal bulan ini.
						</p>
					</div>
					<div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
						<Button variant="outline" asChild>
							<Link to="/calendar">
								<Calendar className="mr-2 size-4" />
								Kalender
							</Link>
						</Button>
						{activeBookings[0] && (
							<Button asChild>
								<Link to={`/bookings/${activeBookings[0].id}`}>
									<ExternalLink className="mr-2 size-4" />
									Booking Aktif
								</Link>
							</Button>
						)}
					</div>
				</div>

				<div className="grid gap-3 md:grid-cols-3">
					<div className="rounded-lg border bg-muted/40 p-4">
						<p className="text-sm text-muted-foreground">Status kendaraan</p>
						<p className="mt-1 text-lg font-semibold">{statusLabel(vehicle.status)}</p>
					</div>
					<div className="rounded-lg border bg-muted/40 p-4">
						<p className="flex items-center gap-2 text-sm text-muted-foreground">
							<Gauge className="size-4" />
							KM sekarang
						</p>
						<p className="mt-1 text-lg font-semibold">
							{vehicle.totalKm ? `${vehicle.totalKm.toLocaleString('id-ID')} km` : '-'}
						</p>
					</div>
					<div className="rounded-lg border bg-muted/40 p-4">
						<p className="text-sm text-muted-foreground">Hari ter-book bulan ini</p>
						<p className="mt-1 text-lg font-semibold">
							{calendarLoading ? '...' : `${bookedDaysThisMonth} hari`}
						</p>
					</div>
					<div className="rounded-lg border bg-muted/40 p-4 md:col-span-3">
						<p className="text-sm text-muted-foreground">Booking berikutnya</p>
						<p className="mt-1 text-sm font-semibold">
							{nextScheduledBooking
								? `${formatDate(nextScheduledBooking.startDate)} • ${nextScheduledBooking.bookingNumber}`
								: 'Belum ada jadwal'}
						</p>
					</div>
				</div>
			</div>

			{/* Availability & Bookings Section */}
			<div className="rounded-lg border bg-card p-4 sm:p-5 space-y-4">
				<h3 className="flex items-center gap-2 text-base font-semibold">
					<ClipboardCheck className="size-4" />
					Ketersediaan & Booking
				</h3>

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
									{isAvailableToday ? 'Tersedia Hari Ini' : 'Sedang Dipakai'}
								</p>
								<p className="text-xs text-muted-foreground">
									{isAvailableToday
										? `${vehicle.name} tidak memiliki booking aktif hari ini`
										: `${vehicle.name} sedang dalam masa rental aktif`}
								</p>
							</div>
						</div>

						{/* Active Bookings */}
						{activeBookings.length > 0 && (
							<div className="space-y-2">
								<h4 className="text-sm font-semibold flex items-center gap-2">
									<Clock className="size-4 text-[hsl(var(--status-active))]" />
									Rental Aktif
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
													Aktif
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
													{daysRemaining <= 0 ? 'Terlambat' : `${daysRemaining} hari lagi`}
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
									Booking Mendatang
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
													{booking.status === 'Confirmed' ? 'Terkonfirmasi' : booking.status === 'Pending' ? 'Menunggu' : booking.status}
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
													{daysUntil} hari lagi
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
								<p>Tidak ada booking aktif atau mendatang</p>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Edit Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Edit Kendaraan</DialogTitle>
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
						<DialogTitle>Ubah Status Kendaraan</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<p className="text-muted-foreground">
							Pilih status baru untuk kendaraan ini.
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
													title: 'Gagal mengubah status',
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
					title={`Hapus ${vehicle.name}?`}
					description="Aksi ini tidak bisa dibatalkan. Kendaraan akan dihapus permanen. Kendaraan dengan booking aktif atau perawatan aktif tidak bisa dihapus."
					confirmLabel="Hapus"
					variant="danger"
					onConfirm={handleDelete}
					isLoading={deleteMutation.isPending}
				/>
			</div>
		);
	}
