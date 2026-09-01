import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ColumnDef } from '@tanstack/react-table';
import { User, FileText } from 'lucide-react';
import { DataTable } from '@/react-app/components/ui/table';
import { StatusBadge } from '@/react-app/components/data-display/status-badge';
import { Badge } from '@/react-app/components/ui/badge';
import type { Payment, PaymentMethod } from '../types/payment.types';

interface PaymentTableProps {
	data: Payment[];
	isLoading?: boolean;
	onRowClick?: (payment: Payment) => void;
}

const formatCurrency = (amount: number, currency: 'IDR' | 'USD' = 'IDR') => {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
};

const getMethodBadgeVariant = (method: PaymentMethod): 'default' | 'outline' | 'primary' => {
	switch (method) {
		case 'QRIS':
			return 'primary';
		case 'Gateway':
			return 'default';
		default:
			return 'outline';
	}
};

export function PaymentTable({ data, isLoading, onRowClick }: PaymentTableProps) {
	const columns: ColumnDef<Payment>[] = [
		{
			accessorKey: 'createdAt',
			header: 'Date',
			cell: ({ row }) => (
				<div className="text-sm">
					{format(new Date(row.original.createdAt), 'd MMM yyyy')}
				</div>
			),
		},
		{
			accessorKey: 'booking.bookingNumber',
			header: 'Booking',
			cell: ({ row }) => {
				const bookingId = row.original.bookingId ?? row.original.booking?.id;
				return bookingId ? (
					<Link
						to={`/bookings/${bookingId}`}
						className="font-mono text-sm font-medium hover:underline text-primary"
						onClick={(e) => e.stopPropagation()}
					>
						{row.original.booking?.bookingNumber ?? '-'}
					</Link>
				) : (
					<span className="font-mono text-sm text-muted-foreground">-</span>
				);
			},
		},
		{
			accessorKey: 'booking.customer.name',
			header: 'Customer',
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<User className="size-4 text-muted-foreground shrink-0" />
					<div className="min-w-0">
						<div className="font-medium truncate">{row.original.booking?.customer?.name ?? '-'}</div>
						<div className="text-xs text-muted-foreground truncate">
							{row.original.booking?.customer?.phone ?? ''}
						</div>
					</div>
				</div>
			),
		},
		{
			accessorKey: 'amount',
			header: 'Amount',
			cell: ({ row }) => (
				<div className="font-medium">
					{formatCurrency(row.original.amount, row.original.currency)}
				</div>
			),
		},
		{
			accessorKey: 'method',
			header: 'Method',
			cell: ({ row }) => (
				<Badge variant={getMethodBadgeVariant(row.original.method)} size="sm">
					{row.original.method.replace(/_/g, ' ')}
				</Badge>
			),
		},
		{
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => (
				<StatusBadge.Payment
					status={row.original.status.toLowerCase() as 'pending' | 'verified' | 'failed'}
				/>
			),
		},
	];

	const renderCard = (payment: Payment) => (
		<div className="space-y-3">
			<div className="flex items-start justify-between">
				<Link
					to={`/payments/${payment.id}`}
					className="font-mono text-sm font-medium hover:underline text-primary"
				>
					{format(new Date(payment.createdAt), 'd MMM yyyy')}
				</Link>
				<StatusBadge.Payment
					status={payment.status.toLowerCase() as 'pending' | 'verified' | 'failed'}
					size="sm"
				/>
			</div>

			<div className="space-y-2 text-sm">
				<div className="flex items-center gap-2">
					<FileText className="size-4 text-muted-foreground" />
					<span>Booking: {payment.booking?.bookingNumber ?? '-'}</span>
				</div>

				<div className="flex items-center gap-2">
					<User className="size-4 text-muted-foreground" />
					<span className="font-medium">{payment.booking?.customer?.name ?? '-'}</span>
				</div>
			</div>

			<div className="flex items-center justify-between pt-2 border-t">
				<Badge variant={getMethodBadgeVariant(payment.method)} size="sm">
					{payment.method.replace(/_/g, ' ')}
				</Badge>
				<span className="font-semibold">
					{formatCurrency(payment.amount, payment.currency)}
				</span>
			</div>
		</div>
	);

	return (
		<DataTable
			columns={columns}
			data={data}
			isLoading={isLoading}
			searchPlaceholder="Search payments..."
			onRowClick={onRowClick}
			renderCard={renderCard}
			noDataMessage="No payments found"
			noDataDescription="Payments will appear here once recorded"
		/>
	);
}