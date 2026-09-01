import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, QrCode } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { BookingTable } from '../components/BookingTable';
import { BookingForm } from '../components/BookingForm';
import { QrScannerModal } from '../components/QrScannerModal';
import { useBookings, useCreateBooking } from '../hooks/useBookings';
import type { Booking, BookingFormData, BookingFilters } from '../types/booking.types';
import {
	Dialog,
	DialogContent,
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
import { bookingStatusLabels } from '@/react-app/lib/labels';

export function BookingsPage() {
	const navigate = useNavigate();
	const [filters, setFilters] = useState<BookingFilters>({});
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isScanOpen, setIsScanOpen] = useState(false);

	const { data, isLoading } = useBookings(filters);
	const createBooking = useCreateBooking();

	const handleCreateBooking = async (data: BookingFormData) => {
		const response = await createBooking.mutateAsync({
			customerId: data.customerId,
			vehicleId: data.vehicleId,
			startDate: data.startDate.toISOString().split('T')[0],
			endDate: data.endDate.toISOString().split('T')[0],
			paymentTerms: data.paymentTerms,
			currency: data.currency,
			addons: data.addons,
			notes: data.notes,
		});
		setIsCreateOpen(false);
		navigate(`/bookings/${response.data.id}`);
	};

	const handleRowClick = (booking: Booking) => {
		navigate(`/bookings/${booking.id}`);
	};

	return (
		<div className="space-y-6">
			<PageHeader
				title="Booking"
				description="Kelola jadwal rental, customer, kendaraan, dan status booking"
				actions={
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => setIsScanOpen(true)}>
							<QrCode className="size-4 mr-2" />
							Scan QR
						</Button>
						<Button onClick={() => setIsCreateOpen(true)}>
							<Plus className="size-4 mr-2" />
							Booking Baru
						</Button>
					</div>
				}
			/>

			{/* Filters */}
			<div className="flex gap-4 items-center">
				<Select
					value={filters.status || 'all'}
					onValueChange={(value) =>
						setFilters({
							...filters,
							status: value === 'all' ? undefined : (value as BookingFilters['status']),
						})
					}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Semua status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Semua status</SelectItem>
						<SelectItem value="Pending">{bookingStatusLabels.pending}</SelectItem>
						<SelectItem value="pending_payment">{bookingStatusLabels.pending_payment}</SelectItem>
						<SelectItem value="Confirmed">{bookingStatusLabels.confirmed}</SelectItem>
						<SelectItem value="Active">{bookingStatusLabels.active}</SelectItem>
						<SelectItem value="Completed">{bookingStatusLabels.completed}</SelectItem>
						<SelectItem value="Cancelled">{bookingStatusLabels.cancelled}</SelectItem>
						<SelectItem value="payment_failed">{bookingStatusLabels.payment_failed}</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			<BookingsDataTable
				data={data?.items ?? []}
				isLoading={isLoading}
				onRowClick={handleRowClick}
			/>

			{/* Create Dialog */}
			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Buat Booking Baru</DialogTitle>
					</DialogHeader>
					<BookingForm
						onSubmit={handleCreateBooking}
						onCancel={() => setIsCreateOpen(false)}
						isLoading={createBooking.isPending}
					/>
				</DialogContent>
			</Dialog>

			{/* QR Scanner Modal (admin scans vehicle to resolve active rental) */}
			<QrScannerModal open={isScanOpen} onOpenChange={setIsScanOpen} />
		</div>
	);
}

// Wrapper to handle the table data type
function BookingsDataTable({
	data,
	isLoading,
	onRowClick,
}: {
	data: Booking[];
	isLoading: boolean;
	onRowClick: (booking: Booking) => void;
}) {
	return <BookingTable data={data} isLoading={isLoading} onRowClick={onRowClick} />;
}
