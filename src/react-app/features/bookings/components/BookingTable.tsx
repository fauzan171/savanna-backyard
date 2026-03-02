import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';
import { Calendar, User, Car, ArrowRight } from 'lucide-react';
import { DataTable } from '@/react-app/components/ui/table';
import { StatusBadge } from '@/react-app/components/data-display/status-badge';
import { Badge } from '@/react-app/components/ui/badge';
import type { Booking } from '../types/booking.types';

interface BookingTableProps {
	data: Booking[];
	isLoading?: boolean;
	onRowClick?: (booking: Booking) => void;
}

const formatCurrency = (amount: number, currency: 'IDR' | 'USD' = 'IDR') => {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
};

export function BookingTable({ data, isLoading, onRowClick }: BookingTableProps) {
	const columns: ColumnDef<Booking>[] = [
		{
			accessorKey: 'bookingNumber',
			header: 'Booking #',
			cell: ({ row }) => (
				<Link
					to={`/bookings/${row.original.id}`}
					className="font-mono text-sm font-medium hover:underline text-primary"
					onClick={(e) => e.stopPropagation()}
				>
					{row.original.bookingNumber}
				</Link>
			),
		},
		{
			accessorKey: 'customer.name',
			header: 'Customer',
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<User className="size-4 text-muted-foreground shrink-0" />
					<div className="min-w-0">
						<div className="font-medium truncate">{row.original.customer.name}</div>
						<div className="text-xs text-muted-foreground truncate">
							{row.original.customer.phone}
						</div>
					</div>
					{row.original.customer.isBlacklisted && (
						<Badge variant="error" size="sm" className="shrink-0">
							Blacklisted
						</Badge>
					)}
				</div>
			),
		},
		{
			accessorKey: 'vehicle.name',
			header: 'Vehicle',
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<Car className="size-4 text-muted-foreground shrink-0" />
					<div className="min-w-0">
						<div className="font-medium truncate">{row.original.vehicle.name}</div>
						<div className="text-xs text-muted-foreground">
							{row.original.vehicle.plateNumber}
						</div>
					</div>
				</div>
			),
		},
		{
			accessorKey: 'startDate',
			header: 'Rental Period',
			cell: ({ row }) => {
				const startDate = new Date(row.original.startDate);
				const endDate = new Date(row.original.endDate);
				const days = Math.ceil(
					(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
				) + 1;

				return (
					<div className="flex items-center gap-2">
						<Calendar className="size-4 text-muted-foreground shrink-0" />
						<div>
							<div className="text-sm">
								{format(startDate, 'd MMM')}{' '}
								<ArrowRight className="inline size-3 mx-1" />
								{format(endDate, 'd MMM yyyy')}
							</div>
							<div className="text-xs text-muted-foreground">
								{days} {days === 1 ? 'day' : 'days'}
							</div>
						</div>
					</div>
				);
			},
		},
		{
			accessorKey: 'totalAmount',
			header: 'Total',
			cell: ({ row }) => (
				<div className="text-right">
					<div className="font-medium">
						{formatCurrency(row.original.totalAmount, row.original.currency)}
					</div>
				</div>
			),
		},
		{
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => (
				<StatusBadge.Booking
					status={row.original.status.toLowerCase() as 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'}
				/>
			),
		},
	];

	const renderCard = (booking: Booking) => (
		<div className="space-y-3">
			<div className="flex items-start justify-between">
				<Link
					to={`/bookings/${booking.id}`}
					className="font-mono text-sm font-medium hover:underline text-primary"
				>
					{booking.bookingNumber}
				</Link>
				<StatusBadge.Booking
					status={booking.status.toLowerCase() as 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'}
					size="sm"
				/>
			</div>

			<div className="space-y-2 text-sm">
				<div className="flex items-center gap-2">
					<User className="size-4 text-muted-foreground" />
					<span className="font-medium">{booking.customer.name}</span>
					{booking.customer.isBlacklisted && (
						<Badge variant="error" size="sm">
							Blacklisted
						</Badge>
					)}
				</div>

				<div className="flex items-center gap-2">
					<Car className="size-4 text-muted-foreground" />
					<span>
						{booking.vehicle.name} ({booking.vehicle.plateNumber})
					</span>
				</div>

				<div className="flex items-center gap-2">
					<Calendar className="size-4 text-muted-foreground" />
					<span>
						{format(new Date(booking.startDate), 'd MMM')} -{' '}
						{format(new Date(booking.endDate), 'd MMM yyyy')}
					</span>
				</div>
			</div>

			<div className="flex items-center justify-between pt-2 border-t">
				<span className="text-sm text-muted-foreground">Total</span>
				<span className="font-semibold">
					{formatCurrency(booking.totalAmount, booking.currency)}
				</span>
			</div>
		</div>
	);

	return (
		<DataTable
			columns={columns}
			data={data}
			isLoading={isLoading}
			searchPlaceholder="Search bookings..."
			onRowClick={onRowClick}
			renderCard={renderCard}
			noDataMessage="No bookings found"
			noDataDescription="Create your first booking to get started"
		/>
	);
}
