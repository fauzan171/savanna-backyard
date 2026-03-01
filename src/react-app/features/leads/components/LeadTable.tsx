import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Eye, ArrowRight } from 'lucide-react';
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
import type { Lead, LeadStatus, LeadPriority } from '../types/lead.types';

interface LeadTableProps {
	data: Lead[];
	isLoading?: boolean;
	onConvert?: (lead: Lead) => void;
	onRowClick?: (lead: Lead) => void;
}

const statusConfig: Record<LeadStatus, { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
	New: { variant: 'info', label: 'New' },
	Contacted: { variant: 'warning', label: 'Contacted' },
	Negotiating: { variant: 'warning', label: 'Negotiating' },
	Converted: { variant: 'success', label: 'Converted' },
	Lost: { variant: 'error', label: 'Lost' },
};

const priorityConfig: Record<LeadPriority, { color: string; label: string }> = {
	Hot: { color: 'text-red-500', label: '🔥 Hot' },
	Warm: { color: 'text-orange-500', label: 'Warm' },
	Cold: { color: 'text-blue-500', label: 'Cold' },
};

export function LeadTable({ data, isLoading, onConvert, onRowClick }: LeadTableProps) {
	const columns: ColumnDef<Lead>[] = useMemo(
		() => [
			{
				accessorKey: 'name',
				header: 'Name',
				cell: ({ row }) => (
					<div>
						<Link
							to={`/leads/${row.original.id}`}
							className="font-medium text-foreground hover:text-primary hover:underline"
						>
							{row.original.name}
						</Link>
						<div className={priorityConfig[row.original.priority]?.color + ' text-xs'}>
							{priorityConfig[row.original.priority]?.label}
						</div>
					</div>
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
				accessorKey: 'source',
				header: 'Source',
				cell: ({ row }) => (
					<span className="text-muted-foreground">{row.original.source}</span>
				),
			},
			{
				accessorKey: 'status',
				header: 'Status',
				cell: ({ row }) => {
					const config = statusConfig[row.original.status];
					return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
				},
			},
			{
				accessorKey: 'assignedTo',
				header: 'Assigned To',
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{row.original.assignedTo?.name || '-'}
					</span>
				),
			},
			{
				accessorKey: 'followUpDate',
				header: 'Follow-up',
				cell: ({ row }) => {
					if (!row.original.followUpDate) return <span className="text-muted-foreground">-</span>;
					const date = new Date(row.original.followUpDate);
					const today = new Date();
					today.setHours(0, 0, 0, 0);
					const isOverdue = date < today && row.original.status !== 'Converted' && row.original.status !== 'Lost';
					return (
						<span className={isOverdue ? 'text-red-500' : 'text-muted-foreground'}>
							{date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
							{isOverdue && ' (Overdue)'}
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
								<Link to={`/leads/${row.original.id}`}>
									<Eye className="mr-2 size-4" />
									View Details
								</Link>
							</DropdownMenuItem>
							{row.original.status !== 'Converted' && row.original.status !== 'Lost' && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={() => onConvert?.(row.original)}>
										<ArrowRight className="mr-2 size-4" />
										Convert to Booking
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				),
			},
		],
		[onConvert]
	);

	const renderCard = (lead: Lead) => (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<span className="font-medium">{lead.name}</span>
				<Badge variant={statusConfig[lead.status].variant} size="sm">
					{statusConfig[lead.status].label}
				</Badge>
			</div>
			<div className="text-sm text-muted-foreground">{lead.phone}</div>
			<div className="flex items-center gap-2">
				<span className="text-xs text-muted-foreground">{lead.source}</span>
				<span className={priorityConfig[lead.priority]?.color + ' text-xs'}>
					{priorityConfig[lead.priority]?.label}
				</span>
			</div>
		</div>
	);

	return (
		<DataTable
			columns={columns}
			data={data}
			isLoading={isLoading}
			searchPlaceholder="Search leads..."
			noDataMessage="No leads found"
			noDataDescription="Add your first lead to get started"
			onRowClick={onRowClick}
			renderCard={renderCard}
		/>
	);
}
