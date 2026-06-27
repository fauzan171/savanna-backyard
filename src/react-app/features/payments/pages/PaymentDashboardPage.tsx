import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { CreditCard, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { DataTable } from '@/react-app/components/ui/table';
import { Badge } from '@/react-app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/react-app/components/ui/card';
import { Spinner } from '@/react-app/components/ui/spinner';
import { api } from '@/react-app/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';

interface BookingPaymentSummary {
	bookingId: string;
	bookingNumber: string;
	customerName: string;
	vehicleName: string;
	startDate: string;
	endDate: string;
	totalAmount: number;
	totalPaid: number;
	pendingAmount: number;
	remaining: number;
	isFullyPaid: boolean;
	paymentProgress: number;
	bookingStatus: string;
	paymentType: string;
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

export function PaymentDashboardPage() {
	const navigate = useNavigate();
	const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');

	const { data: summaries, isLoading } = useQuery({
		queryKey: ['payments', 'booking-summaries'],
		queryFn: () => api.get<ApiSuccessResponse<BookingPaymentSummary[]>>('/v1/payments/booking-summaries'),
		select: (data) => data.data,
	});

	const filteredData = (summaries ?? []).filter((item) => {
		if (statusFilter === 'paid') return item.isFullyPaid;
		if (statusFilter === 'partial') return !item.isFullyPaid && item.totalPaid > 0;
		if (statusFilter === 'unpaid') return item.totalPaid === 0;
		return true;
	});

	const stats = {
		total: summaries?.length ?? 0,
		fullyPaid: summaries?.filter((s) => s.isFullyPaid).length ?? 0,
		partial: summaries?.filter((s) => !s.isFullyPaid && s.totalPaid > 0).length ?? 0,
		unpaid: summaries?.filter((s) => s.totalPaid === 0).length ?? 0,
		totalRevenue: summaries?.reduce((sum, s) => sum + s.totalPaid, 0) ?? 0,
	};

	const columns: ColumnDef<BookingPaymentSummary>[] = [
		{
			accessorKey: 'bookingNumber',
			header: 'Booking',
			cell: ({ row }) => (
				<Link
					to={`/bookings/${row.original.bookingId}`}
					className="font-medium text-primary hover:underline"
				>
					{row.original.bookingNumber}
				</Link>
			),
		},
		{ accessorKey: 'customerName', header: 'Customer' },
		{ accessorKey: 'vehicleName', header: 'Vehicle' },
		{
			accessorKey: 'startDate',
			header: 'Start Date',
			cell: ({ row }) => format(new Date(row.original.startDate), 'dd MMM yyyy'),
		},
		{
			accessorKey: 'totalAmount',
			header: 'Total',
			cell: ({ row }) => formatCurrency(row.original.totalAmount),
		},
		{
			accessorKey: 'totalPaid',
			header: 'Paid',
			cell: ({ row }) => (
				<span className={row.original.isFullyPaid ? 'text-green-600 font-medium' : ''}>
					{formatCurrency(row.original.totalPaid)}
				</span>
			),
		},
		{
			accessorKey: 'remaining',
			header: 'Remaining',
			cell: ({ row }) => (
				<span className={row.original.remaining > 0 ? 'text-orange-600 font-medium' : ''}>
					{formatCurrency(row.original.remaining)}
				</span>
			),
		},
		{
			accessorKey: 'paymentProgress',
			header: 'Progress',
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
						<div
							className={`h-full rounded-full ${row.original.isFullyPaid ? 'bg-green-500' : 'bg-orange-500'}`}
							style={{ width: `${Math.min(row.original.paymentProgress, 100)}%` }}
						/>
					</div>
					<span className="text-xs text-muted-foreground">{Math.round(row.original.paymentProgress)}%</span>
				</div>
			),
		},
		{
			accessorKey: 'bookingStatus',
			header: 'Status',
			cell: ({ row }) => {
				const status = row.original.bookingStatus;
				const colors: Record<string, string> = {
					Confirmed: 'bg-green-100 text-green-800 border-green-200',
					pending_payment: 'bg-yellow-100 text-yellow-800 border-yellow-200',
					Active: 'bg-blue-100 text-blue-800 border-blue-200',
					Completed: 'bg-gray-100 text-gray-800 border-gray-200',
				};
				return (
					<Badge variant="outline" className={colors[status] ?? ''}>
						{status}
					</Badge>
				);
			},
		},
	];

	const renderCard = (item: BookingPaymentSummary) => (
		<div className="p-4 border rounded-lg">
			<div className="flex items-center justify-between">
				<Link to={`/bookings/${item.bookingId}`} className="font-medium text-primary hover:underline">
					{item.bookingNumber}
				</Link>
				<Badge variant="outline" className={item.isFullyPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}>
					{item.isFullyPaid ? 'Paid' : item.totalPaid > 0 ? 'DP Paid' : 'Unpaid'}
				</Badge>
			</div>
			<div className="mt-2 text-sm text-muted-foreground">
				{item.customerName} · {item.vehicleName}
			</div>
			<div className="mt-2 flex items-center gap-2">
				<div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
					<div
						className={`h-full rounded-full ${item.isFullyPaid ? 'bg-green-500' : 'bg-orange-500'}`}
						style={{ width: `${Math.min(item.paymentProgress, 100)}%` }}
					/>
				</div>
				<span className="text-xs text-muted-foreground">{Math.round(item.paymentProgress)}%</span>
			</div>
			<div className="mt-2 flex justify-between text-sm">
				<span className="text-muted-foreground">Paid: {formatCurrency(item.totalPaid)}</span>
				<span className="font-medium">{formatCurrency(item.totalAmount)}</span>
			</div>
		</div>
	);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Payment Dashboard"
				description="Track payment status for all bookings"
			/>

			{/* Stats Cards */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
						<CreditCard className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.total}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Fully Paid</CardTitle>
						<CheckCircle className="size-4 text-green-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">{stats.fullyPaid}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">DP Paid</CardTitle>
						<Clock className="size-4 text-orange-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-orange-600">{stats.partial}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Unpaid</CardTitle>
						<AlertTriangle className="size-4 text-red-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">{stats.unpaid}</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters */}
			<div className="flex gap-2">
				{(['all', 'paid', 'partial', 'unpaid'] as const).map((filter) => (
					<button
						key={filter}
						onClick={() => setStatusFilter(filter)}
						className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
							statusFilter === filter
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground hover:bg-muted/80'
						}`}
					>
						{filter === 'all' ? 'All' : filter === 'paid' ? 'Fully Paid' : filter === 'partial' ? 'DP Paid' : 'Unpaid'}
					</button>
				))}
			</div>

			{/* Table */}
			<DataTable
				columns={columns}
				data={filteredData}
				isLoading={isLoading}
				searchPlaceholder="Search bookings..."
				onRowClick={(row) => navigate(`/bookings/${row.bookingId}`)}
				renderCard={renderCard}
				noDataMessage="No bookings found"
				noDataDescription="Payment data will appear here"
			/>
		</div>
	);
}
