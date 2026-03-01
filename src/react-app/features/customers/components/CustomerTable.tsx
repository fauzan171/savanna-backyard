import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Ban, Eye } from 'lucide-react';
import { DataTable } from '@/react-app/components/ui/table';
import { Badge } from '@/react-app/components/ui/badge';
import { Button } from '@/react-app/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/react-app/components/ui/dropdown-menu';
import type { Customer } from '../types/customer.types';

interface CustomerTableProps {
	data: Customer[];
	isLoading?: boolean;
	onBlacklist?: (customer: Customer) => void;
	onRowClick?: (customer: Customer) => void;
}

export function CustomerTable({ data, isLoading, onBlacklist, onRowClick }: CustomerTableProps) {
	const columns: ColumnDef<Customer>[] = useMemo(
		() => [
			{
				accessorKey: 'name',
				header: 'Name',
				cell: ({ row }) => (
					<Link
						to={`/customers/${row.original.id}`}
						className="font-medium text-foreground hover:text-primary hover:underline"
					>
						{row.original.name}
					</Link>
				),
			},
			{
				accessorKey: 'phone',
				header: 'Phone',
				cell: ({ row }) => (
					<span className="text-muted-foreground">{row.original.phone}</span>
				),
			},
			{
				accessorKey: 'email',
				header: 'Email',
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{row.original.email || '-'}
					</span>
				),
			},
			{
				accessorKey: 'identityType',
				header: 'ID Type',
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{row.original.identityType || '-'}
					</span>
				),
			},
			{
				accessorKey: 'status',
				header: 'Status',
				cell: ({ row }) =>
					row.original.isBlacklisted ? (
						<Badge variant="error" size="sm">Blacklisted</Badge>
					) : (
						<Badge variant="outline" size="sm">Active</Badge>
					),
			},
			{
				accessorKey: 'createdAt',
				header: 'Created',
				cell: ({ row }) => {
					const date = new Date(row.original.createdAt);
					return (
						<span className="text-muted-foreground text-sm">
							{date.toLocaleDateString('id-ID', {
								day: 'numeric',
								month: 'short',
								year: 'numeric',
							})}
						</span>
					);
				},
			},
			{
				id: 'actions',
				header: '',
				cell: ({ row }) => (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="size-8">
								<MoreHorizontal className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem asChild>
								<Link to={`/customers/${row.original.id}`}>
									<Eye className="mr-2 size-4" />
									View Details
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => onBlacklist?.(row.original)}
								className={row.original.isBlacklisted ? 'text-green-600' : 'text-error'}
							>
								<Ban className="mr-2 size-4" />
								{row.original.isBlacklisted ? 'Remove from Blacklist' : 'Add to Blacklist'}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				),
			},
		],
		[onBlacklist]
	);

	const renderCard = (customer: Customer) => (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<span className="font-medium">{customer.name}</span>
				{customer.isBlacklisted ? (
					<Badge variant="error" size="sm">Blacklisted</Badge>
				) : (
					<Badge variant="outline" size="sm">Active</Badge>
				)}
			</div>
			<div className="text-sm text-muted-foreground">{customer.phone}</div>
			{customer.email && (
				<div className="text-sm text-muted-foreground">{customer.email}</div>
			)}
		</div>
	);

	return (
		<DataTable
			columns={columns}
			data={data}
			isLoading={isLoading}
			searchPlaceholder="Search customers..."
			noDataMessage="No customers found"
			noDataDescription="Add your first customer to get started"
			onRowClick={onRowClick}
			renderCard={renderCard}
		/>
	);
}
