import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { BookingTable } from '../components/BookingTable';
import { BookingForm } from '../components/BookingForm';
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

export function BookingsPage() {
	const navigate = useNavigate();
	const [filters, setFilters] = useState<BookingFilters>({});
	const [isCreateOpen, setIsCreateOpen] = useState(false);

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
				title="Bookings"
				description="Manage vehicle rental bookings"
				actions={
					<Button onClick={() => setIsCreateOpen(true)}>
						<Plus className="size-4 mr-2" />
						New Booking
					</Button>
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
						<SelectValue placeholder="All Statuses" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Statuses</SelectItem>
						<SelectItem value="Pending">Pending</SelectItem>
						<SelectItem value="Confirmed">Confirmed</SelectItem>
						<SelectItem value="Active">Active</SelectItem>
						<SelectItem value="Completed">Completed</SelectItem>
						<SelectItem value="Cancelled">Cancelled</SelectItem>
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
						<DialogTitle>Create New Booking</DialogTitle>
					</DialogHeader>
					<BookingForm
						onSubmit={handleCreateBooking}
						onCancel={() => setIsCreateOpen(false)}
						isLoading={createBooking.isPending}
					/>
				</DialogContent>
			</Dialog>
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
