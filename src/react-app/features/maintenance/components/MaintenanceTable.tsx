import { useMemo } from 'react';
import { Link } from 'react-router';
import { format } from 'date-fns';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Wrench, Calendar, DollarSign, MoreHorizontal, Play, CheckCircle } from 'lucide-react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/react-app/components/ui/table';
import { Badge } from '@/react-app/components/ui/badge';
import { Button } from '@/react-app/components/ui/button';
import { Skeleton } from '@/react-app/components/ui/skeleton';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/react-app/components/ui/dropdown-menu';
import type { Maintenance, MaintenanceStatus, MaintenanceType } from '../types/maintenance.types';
import { getAvailableActions } from '../types/maintenance.types';

interface MaintenanceTableProps {
	data: Maintenance[] | undefined;
	isLoading: boolean;
	onStart?: (id: string) => void;
	onComplete?: (id: string) => void;
}

const typeVariantMap: Record<MaintenanceType, 'default' | 'success' | 'error' | 'warning' | 'info' | 'outline' | 'primary'> = {
	Scheduled: 'info',
	Repair: 'warning',
	Damage: 'error',
};

const statusVariantMap: Record<MaintenanceStatus, 'default' | 'success' | 'error' | 'warning' | 'info' | 'outline' | 'primary'> = {
	Scheduled: 'outline',
	InProgress: 'warning',
	Completed: 'success',
};

const formatCurrency = (amount: number | null) => {
	if (amount === null) return '-';
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		minimumFractionDigits: 0,
	}).format(amount);
};

export function MaintenanceTable({ data, isLoading, onStart, onComplete }: MaintenanceTableProps) {
	const columns: ColumnDef<Maintenance>[] = useMemo(
		() => [
			{
				accessorKey: 'startDate',
				header: () => (
					<div className="flex items-center gap-2">
						<Calendar className="h-4 w-4" />
						<span>Date</span>
					</div>
				),
				cell: ({ row }) => (
					<div className="flex flex-col">
						<span className="font-medium">
							{format(new Date(row.original.startDate), 'MMM d, yyyy')}
						</span>
						{row.original.endDate && (
							<span className="text-xs text-muted-foreground">
								to {format(new Date(row.original.endDate), 'MMM d, yyyy')}
							</span>
						)}
					</div>
				),
			},
			{
				accessorKey: 'type',
				header: 'Type',
				cell: ({ row }) => (
					<Badge variant={typeVariantMap[row.original.type]}>{row.original.type}</Badge>
				),
			},
			{
				accessorKey: 'description',
				header: 'Description',
				cell: ({ row }) => (
					<span className="line-clamp-2 max-w-[300px]">{row.original.description}</span>
				),
			},
			{
				accessorKey: 'cost',
				header: () => (
					<div className="flex items-center gap-2">
						<DollarSign className="h-4 w-4" />
						<span>Cost</span>
					</div>
				),
				cell: ({ row }) => formatCurrency(row.original.cost),
			},
			{
				accessorKey: 'status',
				header: 'Status',
				cell: ({ row }) => (
					<Badge variant={statusVariantMap[row.original.status]}>{row.original.status}</Badge>
				),
			},
			{
				id: 'actions',
				cell: ({ row }) => {
					const actions = getAvailableActions(row.original.status);
					return (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="h-8 w-8">
									<MoreHorizontal className="h-4 w-4" />
									<span className="sr-only">Open menu</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem asChild>
									<Link to={`/maintenance/${row.original.id}`}>View details</Link>
								</DropdownMenuItem>
								{actions.map((action) => (
									<DropdownMenuItem
										key={action.action}
										onClick={() => {
											if (action.action === 'start' && onStart) {
												onStart(row.original.id);
											} else if (action.action === 'complete' && onComplete) {
												onComplete(row.original.id);
											}
										}}
									>
										{action.action === 'start' && <Play className="mr-2 h-4 w-4" />}
										{action.action === 'complete' && <CheckCircle className="mr-2 h-4 w-4" />}
										{action.label}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					);
				},
			},
		],
		[onStart, onComplete]
	);

	const table = useReactTable({
		data: data ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	if (isLoading) {
		return (
			<div className="space-y-3">
				{[...Array(5)].map((_, i) => (
					<Skeleton key={i} className="h-12 w-full" />
				))}
			</div>
		);
	}

	if (!data || data.length === 0) {
		return (
			<div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
				<div className="text-center">
					<Wrench className="mx-auto h-8 w-8 text-muted-foreground" />
					<p className="mt-2 text-sm text-muted-foreground">No maintenance records found</p>
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-lg border">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id}>
									{header.isPlaceholder
										? null
										: flexRender(header.column.columnDef.header, header.getContext())}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.map((row) => (
						<TableRow key={row.id}>
							{row.getVisibleCells().map((cell) => (
								<TableCell key={cell.id}>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
