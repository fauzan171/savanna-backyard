import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Wrench, Eye, QrCode, Trash2 } from 'lucide-react';
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
import type { Vehicle, VehicleStatus } from '../types/vehicle.types';
import { vehicleStatusLabels, vehicleTypeLabels } from '@/react-app/lib/labels';

interface VehicleTableProps {
	data: Vehicle[];
	isLoading?: boolean;
	onStatusChange?: (vehicle: Vehicle) => void;
	onRowClick?: (vehicle: Vehicle) => void;
	onQrClick?: (vehicle: Vehicle) => void;
	onDelete?: (vehicle: Vehicle) => void;
}

const statusConfig: Record<VehicleStatus, { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
	Available: { variant: 'success', label: vehicleStatusLabels.available },
	Rented: { variant: 'info', label: vehicleStatusLabels.rented },
	Cleaning: { variant: 'default', label: vehicleStatusLabels.cleaning },
	Maintenance: { variant: 'warning', label: vehicleStatusLabels.maintenance },
	Inactive: { variant: 'default', label: vehicleStatusLabels.inactive },
};

export function VehicleTable({ data, isLoading, onStatusChange, onRowClick, onQrClick, onDelete }: VehicleTableProps) {
	const columns: ColumnDef<Vehicle>[] = useMemo(
		() => [
			{
				accessorKey: 'name',
				header: 'Nama',
				cell: ({ row }) => (
					<Link
						to={`/vehicles/${row.original.id}`}
						className="font-medium text-foreground hover:text-primary hover:underline"
					>
						{row.original.name}
					</Link>
				),
			},
			{
				accessorKey: 'plateNumber',
				header: 'Plat Nomor',
				cell: ({ row }) => (
					<span className="font-mono text-muted-foreground">{row.original.plateNumber}</span>
				),
			},
			{
				accessorKey: 'type',
				header: 'Jenis',
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{vehicleTypeLabels[row.original.type] || row.original.type}
					</span>
				),
			},
			{
				accessorKey: 'dailyRateIdr',
				header: 'Tarif Harian',
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{new Intl.NumberFormat('id-ID', {
							style: 'currency',
							currency: 'IDR',
							minimumFractionDigits: 0,
						}).format(row.original.dailyRateIdr)}
					</span>
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
				accessorKey: 'totalKm',
				header: 'Odometer',
				cell: ({ row }) => (
					<span className="text-muted-foreground">
						{row.original.totalKm ? `${row.original.totalKm.toLocaleString()} km` : '-'}
					</span>
				),
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
								<Link to={`/vehicles/${row.original.id}`}>
									<Eye className="mr-2 size-4" />
									Lihat Detail
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => onStatusChange?.(row.original)}>
								<Wrench className="mr-2 size-4" />
								Ubah Status
							</DropdownMenuItem>
							{onQrClick && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={() => onQrClick(row.original)}>
										<QrCode className="mr-2 size-4" />
										Buat QR
									</DropdownMenuItem>
								</>
							)}
							{onDelete && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										className="text-destructive"
										onClick={() => onDelete(row.original)}
									>
										<Trash2 className="mr-2 size-4" />
										Hapus
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				),
			},
		],
		[onStatusChange, onQrClick, onDelete]
	);

	const renderCard = (vehicle: Vehicle) => (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<span className="font-medium">{vehicle.name}</span>
				<Badge variant={statusConfig[vehicle.status].variant} size="sm">
					{statusConfig[vehicle.status].label}
				</Badge>
			</div>
			<div className="text-sm text-muted-foreground font-mono">{vehicle.plateNumber}</div>
			<div className="text-sm text-muted-foreground">{vehicleTypeLabels[vehicle.type] || vehicle.type}</div>
		</div>
	);

	return (
		<DataTable
			columns={columns}
			data={data}
			isLoading={isLoading}
			searchPlaceholder="Cari kendaraan..."
			noDataMessage="Belum ada kendaraan"
			noDataDescription="Tambah kendaraan pertama untuk mulai menerima booking"
			onRowClick={onRowClick}
			renderCard={renderCard}
		/>
	);
}
