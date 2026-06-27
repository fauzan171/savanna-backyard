import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Car, CheckCircle, Wrench, XCircle, Clock } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { DataTable } from '@/react-app/components/ui/table';
import { Badge } from '@/react-app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/react-app/components/ui/card';
import { api } from '@/react-app/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';

interface VehicleAvailability {
	id: string;
	name: string;
	type: string;
	plateNumber: string;
	status: string;
	currentBooking: {
		bookingNumber: string;
		customerName: string;
		endDate: string;
	} | null;
	nextAvailableDate: string | null;
}

interface AvailabilityTimeline {
	vehicles: VehicleAvailability[];
	summary: {
		total: number;
		available: number;
		rented: number;
		maintenance: number;
		inactive: number;
	};
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
	Available: { color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle className="size-4" />, label: 'Available' },
	Rented: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Car className="size-4" />, label: 'Rented' },
	Maintenance: { color: 'bg-red-100 text-red-800 border-red-200', icon: <Wrench className="size-4" />, label: 'Maintenance' },
	Inactive: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: <XCircle className="size-4" />, label: 'Inactive' },
};

export function VehicleAvailabilityPage() {
	const navigate = useNavigate();

	const { data: timeline, isLoading } = useQuery({
		queryKey: ['vehicles', 'availability-timeline'],
		queryFn: () => api.get<ApiSuccessResponse<AvailabilityTimeline>>('/v1/vehicles/availability-timeline'),
		select: (data) => data.data,
	});

	const columns: ColumnDef<VehicleAvailability>[] = [
		{
			accessorKey: 'name',
			header: 'Vehicle',
			cell: ({ row }) => (
				<Link
					to={`/vehicles/${row.original.id}`}
					className="font-medium text-primary hover:underline"
				>
					{row.original.name}
				</Link>
			),
		},
		{ accessorKey: 'plateNumber', header: 'Plate' },
		{ accessorKey: 'type', header: 'Type' },
		{
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => {
				const config = STATUS_CONFIG[row.original.status] ?? STATUS_CONFIG.Inactive;
				return (
					<Badge variant="outline" className={config.color}>
						{config.icon}
						<span className="ml-1">{config.label}</span>
					</Badge>
				);
			},
		},
		{
			accessorKey: 'currentBooking',
			header: 'Current Rental',
			cell: ({ row }) => {
				const booking = row.original.currentBooking;
				if (!booking) return <span className="text-muted-foreground">—</span>;
				return (
					<div>
						<Link to={`/bookings/${booking.bookingNumber}`} className="text-primary hover:underline">
							{booking.bookingNumber}
						</Link>
						<div className="text-xs text-muted-foreground">Until {format(new Date(booking.endDate), 'dd MMM')}</div>
					</div>
				);
			},
		},
		{
			accessorKey: 'nextAvailableDate',
			header: 'Next Available',
			cell: ({ row }) => {
				const date = row.original.nextAvailableDate;
				if (!date) return <span className="text-muted-foreground">—</span>;
				const isPast = new Date(date) < new Date();
				return (
					<span className={isPast ? 'text-green-600' : ''}>
						{format(new Date(date), 'dd MMM yyyy')}
					</span>
				);
			},
		},
	];

	const renderCard = (vehicle: VehicleAvailability) => {
		const config = STATUS_CONFIG[vehicle.status] ?? STATUS_CONFIG.Inactive;
		return (
			<div className="p-4 border rounded-lg">
				<div className="flex items-center justify-between">
					<Link to={`/vehicles/${vehicle.id}`} className="font-medium text-primary hover:underline">
						{vehicle.name}
					</Link>
					<Badge variant="outline" className={config.color}>
						{config.label}
					</Badge>
				</div>
				<div className="mt-2 text-sm text-muted-foreground">
					{vehicle.plateNumber} · {vehicle.type}
				</div>
				{vehicle.currentBooking && (
					<div className="mt-2 text-sm">
						<span className="text-muted-foreground">Booked: </span>
						{vehicle.currentBooking.bookingNumber} until {format(new Date(vehicle.currentBooking.endDate), 'dd MMM')}
					</div>
				)}
				{vehicle.nextAvailableDate && !vehicle.currentBooking && (
					<div className="mt-2 text-sm">
						<span className="text-muted-foreground">Available from: </span>
						{format(new Date(vehicle.nextAvailableDate), 'dd MMM yyyy')}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="space-y-6">
			<PageHeader
				title="Vehicle Availability"
				description="Track which vehicles are available, rented, or under maintenance"
			/>

			{/* Stats Cards */}
			<div className="grid gap-4 md:grid-cols-5">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Fleet</CardTitle>
						<Car className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{timeline?.summary.total ?? 0}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Available</CardTitle>
						<CheckCircle className="size-4 text-green-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">{timeline?.summary.available ?? 0}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Rented</CardTitle>
						<Car className="size-4 text-yellow-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-yellow-600">{timeline?.summary.rented ?? 0}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Maintenance</CardTitle>
						<Wrench className="size-4 text-red-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">{timeline?.summary.maintenance ?? 0}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Utilization</CardTitle>
						<Clock className="size-4 text-blue-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-blue-600">
							{timeline?.summary.total
								? Math.round(((timeline.summary.rented) / timeline.summary.total) * 100)
								: 0}%
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Table */}
			<DataTable
				columns={columns}
				data={timeline?.vehicles ?? []}
				isLoading={isLoading}
				searchPlaceholder="Search vehicles..."
				onRowClick={(row) => navigate(`/vehicles/${row.id}`)}
				renderCard={renderCard}
				noDataMessage="No vehicles found"
				noDataDescription="Vehicle availability data will appear here"
			/>
		</div>
	);
}
