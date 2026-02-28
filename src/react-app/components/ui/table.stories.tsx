import type { Meta, StoryObj } from '@storybook/react';
import { DataTable, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, createSelectColumn } from './table';
import { Badge } from './badge';
import { Button } from './button';
import type { ColumnDef } from '@tanstack/react-table';

const meta = {
	title: 'UI/Table',
	component: Table,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Table>;

export default meta;

// Sample data
interface Booking {
	id: string;
	customer: string;
	vehicle: string;
	status: 'pending' | 'confirmed' | 'active' | 'completed';
	amount: number;
	date: string;
}

const sampleData: Booking[] = [
	{ id: 'BK-001', customer: 'John Doe', vehicle: 'Honda CRF250', status: 'confirmed', amount: 4500000, date: '15 Jan 2025' },
	{ id: 'BK-002', customer: 'Jane Smith', vehicle: 'Yamaha NMAX', status: 'active', amount: 1200000, date: '16 Jan 2025' },
	{ id: 'BK-003', customer: 'Bob Wilson', vehicle: 'Kawasaki KLX', status: 'pending', amount: 3800000, date: '17 Jan 2025' },
	{ id: 'BK-004', customer: 'Alice Brown', vehicle: 'Honda PCX', status: 'completed', amount: 900000, date: '14 Jan 2025' },
	{ id: 'BK-005', customer: 'Charlie Davis', vehicle: 'Yamaha R15', status: 'confirmed', amount: 1500000, date: '18 Jan 2025' },
];

const columns: ColumnDef<Booking>[] = [
	{ accessorKey: 'id', header: 'ID' },
	{ accessorKey: 'customer', header: 'Customer' },
	{ accessorKey: 'vehicle', header: 'Vehicle' },
	{
		accessorKey: 'status',
		header: 'Status',
		cell: ({ row }) => {
			const status = row.getValue('status') as string;
			const variants: Record<string, 'warning' | 'info' | 'success'> = {
				pending: 'warning',
				confirmed: 'info',
				active: 'success',
				completed: 'success',
			};
			return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
		},
	},
	{
		accessorKey: 'amount',
		header: 'Amount',
		cell: ({ row }) => {
			const amount = row.getValue('amount') as number;
			return `Rp ${amount.toLocaleString('id-ID')}`;
		},
	},
	{ accessorKey: 'date', header: 'Date' },
];

export const Default: Story = {
	render: () => (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>ID</TableHead>
						<TableHead>Customer</TableHead>
						<TableHead>Vehicle</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="text-right">Amount</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sampleData.slice(0, 3).map((booking) => (
						<TableRow key={booking.id}>
							<TableCell className="font-medium">{booking.id}</TableCell>
							<TableCell>{booking.customer}</TableCell>
							<TableCell>{booking.vehicle}</TableCell>
							<TableCell>
								<Badge variant={booking.status === 'confirmed' ? 'info' : 'success'}>
									{booking.status}
								</Badge>
							</TableCell>
							<TableCell className="text-right">
								Rp {booking.amount.toLocaleString('id-ID')}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	),
};

export const DataTableDefault: Story = {
	render: () => (
		<DataTable
			columns={columns}
			data={sampleData}
			searchPlaceholder="Search bookings..."
		/>
	),
};

export const DataTableWithSelection: Story = {
	render: () => (
		<DataTable
			columns={[createSelectColumn<Booking>(), ...columns]}
			data={sampleData}
			enableRowSelection
			searchPlaceholder="Search bookings..."
			onSelectionChange={(rows) => console.log('Selected:', rows)}
		/>
	),
};

export const DataTableEmpty: Story = {
	render: () => (
		<DataTable
			columns={columns}
			data={[]}
			noDataMessage="No bookings found"
			noDataDescription="Create your first booking to get started"
		/>
	),
};

export const DataTableLoading: Story = {
	render: () => (
		<DataTable
			columns={columns}
			data={[]}
			isLoading
		/>
	),
};

export const DataTableNoPagination: Story = {
	render: () => (
		<DataTable
			columns={columns}
			data={sampleData}
			enablePagination={false}
		/>
	),
};

export const DataTableWithRowClick: Story = {
	render: () => (
		<DataTable
			columns={columns}
			data={sampleData}
			onRowClick={(row) => alert(`Clicked: ${row.id}`)}
		/>
	),
};

export const DataTableWithActions: Story = {
	render: () => {
		const columnsWithActions: ColumnDef<Booking>[] = [
			...columns,
			{
				id: 'actions',
				header: 'Actions',
				cell: () => (
					<div className="flex gap-2">
						<Button size="sm" variant="ghost">Edit</Button>
						<Button size="sm" variant="ghost">Delete</Button>
					</div>
				),
			},
		];

		return (
			<DataTable
				columns={columnsWithActions}
				data={sampleData}
			/>
		);
	},
};
