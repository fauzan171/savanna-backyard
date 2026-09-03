import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { toast } from '@/react-app/hooks/useToast';
import { extractApiError } from '@/react-app/lib/extract-error';
import { EquipmentTable } from '../components/EquipmentTable';
import { EquipmentForm } from '../components/EquipmentForm';
import { useEquipmentList, useCreateEquipment, useUpdateEquipment } from '../hooks/useEquipment';
import type { Equipment, EquipmentFilters, CreateEquipmentRequest } from '../types/equipment.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/react-app/components/ui/select';
import { EQUIPMENT_CATEGORY_LABELS, type EquipmentCategory } from '../types/equipment.types';
import { useAuthStore } from '@/react-app/features/auth/stores/authStore';

export function EquipmentPage() {
	const navigate = useNavigate();
	const [filters, setFilters] = useState<EquipmentFilters>({});
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const { user } = useAuthStore();
	const isSuperAdmin = user?.role === 'SUPER_ADMIN';
	const { data: equipment, isLoading } = useEquipmentList(filters);
	const createEquipment = useCreateEquipment();
	const updateEquipment = useUpdateEquipment();

	// TC-EQUIP-002: activate/deactivate straight from the list
	const handleToggle = async (item: Equipment) => {
		try {
			await updateEquipment.mutateAsync({
				id: item.id,
				data: { isActive: !item.isActive },
			});
			toast({ title: item.isActive ? 'Perlengkapan dinonaktifkan' : 'Perlengkapan diaktifkan' });
		} catch (error) {
			toast({
				title: 'Gagal mengubah status',
				description: extractApiError(error),
				variant: 'destructive',
			});
		}
	};

	const handleCreateEquipment = async (data: CreateEquipmentRequest) => {
		try {
			await createEquipment.mutateAsync(data);
			setIsCreateOpen(false);
			toast({ title: 'Perlengkapan berhasil dibuat' });
		} catch (error) {
			toast({
				title: 'Gagal membuat perlengkapan',
				description: extractApiError(error),
				variant: 'destructive',
			});
		}
	};

	const handleRowClick = (item: Equipment) => {
		navigate(`/equipment/${item.id}`);
	};

	return (
		<div className="space-y-6">
			<PageHeader
				title="Perlengkapan"
				description="Kelola perlengkapan rental seperti helm, jersey, dan aksesori"
				actions={isSuperAdmin ? (
					<Button onClick={() => setIsCreateOpen(true)}>
						<Plus className="size-4 mr-2" />
						Tambah Perlengkapan
					</Button>
				) : null}
			/>

			<div className="flex gap-4 items-center">
				<Select
					value={filters.category ?? 'all'}
					onValueChange={(val) =>
						setFilters((prev) => ({
							...prev,
							category: val === 'all' ? undefined : (val as EquipmentCategory),
						}))
					}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Semua kategori" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Semua kategori</SelectItem>
						{(Object.keys(EQUIPMENT_CATEGORY_LABELS) as EquipmentCategory[]).map((cat) => (
							<SelectItem key={cat} value={cat}>
								{EQUIPMENT_CATEGORY_LABELS[cat]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<EquipmentTable
				data={equipment ?? []}
				isLoading={isLoading}
				onRowClick={handleRowClick}
				onToggle={handleToggle}
			/>

			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Tambah Perlengkapan</DialogTitle>
					</DialogHeader>
					<EquipmentForm
						onSubmit={handleCreateEquipment}
						onCancel={() => setIsCreateOpen(false)}
						isLoading={createEquipment.isPending}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}
