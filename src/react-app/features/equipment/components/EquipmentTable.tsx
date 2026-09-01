import { Link } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/react-app/components/ui/badge';
import { DataTable } from '@/react-app/components/ui/table';
import type { Equipment, EquipmentCategory } from '../types/equipment.types';
import { EQUIPMENT_CATEGORY_LABELS, formatCurrency } from '../types/equipment.types';

interface EquipmentTableProps {
	data: Equipment[];
	isLoading?: boolean;
	onRowClick?: (equipment: Equipment) => void;
}

const CATEGORY_COLORS: Record<EquipmentCategory, string> = {
	Safety: 'bg-red-100 text-red-800 border-red-200',
	Apparel: 'bg-blue-100 text-blue-800 border-blue-200',
	Accessories: 'bg-purple-100 text-purple-800 border-purple-200',
	Electronics: 'bg-green-100 text-green-800 border-green-200',
};

export function EquipmentTable({ data, isLoading, onRowClick }: EquipmentTableProps) {
	const columns: ColumnDef<Equipment>[] = [
		{
			accessorKey: 'name',
			header: 'Nama',
			cell: ({ row }) => (
				<Link
					to={`/equipment/${row.original.id}`}
					className="font-medium text-primary hover:underline"
					onClick={(e) => e.stopPropagation()}
				>
					{row.original.name}
				</Link>
			),
		},
		{
			accessorKey: 'category',
			header: 'Kategori',
			cell: ({ row }) => (
				<Badge variant="outline" className={CATEGORY_COLORS[row.original.category]}>
					{EQUIPMENT_CATEGORY_LABELS[row.original.category]}
				</Badge>
			),
		},
		{
			accessorKey: 'dailyRateIdr',
			header: 'Tarif Harian',
			cell: ({ row }) => <div>{formatCurrency(row.original.dailyRateIdr)}</div>,
		},
		{
			accessorKey: 'stock',
			header: 'Stok',
			cell: ({ row }) => (
				<div className={row.original.stock === 0 ? 'text-destructive font-medium' : ''}>
					{row.original.stock}
				</div>
			),
		},
		{
			accessorKey: 'isActive',
			header: 'Status',
			cell: ({ row }) => (
				<Badge variant="outline" className={row.original.isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}>
					{row.original.isActive ? 'Aktif' : 'Nonaktif'}
				</Badge>
			),
		},
	];

	const renderCard = (equipment: Equipment) => (
		<div className="p-4 border rounded-lg">
			<div className="flex items-center justify-between">
				<div className="font-medium">{equipment.name}</div>
				<Badge variant="outline" className={CATEGORY_COLORS[equipment.category]}>
					{EQUIPMENT_CATEGORY_LABELS[equipment.category]}
				</Badge>
			</div>
			<div className="mt-2 text-sm text-muted-foreground">
				{formatCurrency(equipment.dailyRateIdr)}/hari · Stok: {equipment.stock}
			</div>
		</div>
	);

	return (
		<DataTable
			columns={columns}
			data={data}
			isLoading={isLoading}
			searchPlaceholder="Cari perlengkapan..."
			onRowClick={onRowClick}
			renderCard={renderCard}
			noDataMessage="Belum ada perlengkapan"
			noDataDescription="Tambahkan perlengkapan untuk mulai mengelola stok"
		/>
	);
}
