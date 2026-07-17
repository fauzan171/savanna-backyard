import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { useVehicles, useCreateVehicle, useDeleteVehicle } from '../hooks/useVehicles';
import { VehicleTable } from '../components/VehicleTable';
import { VehicleForm } from '../components/VehicleForm';
import { VehicleQrCard } from '../components/VehicleQrCard';
import { ConfirmationDialog } from '@/react-app/components/ui/confirmation-dialog';
import type { Vehicle, VehicleFormData } from '../types/vehicle.types';
import { toast } from '@/react-app/hooks/useToast';

export default function VehiclesPage() {
	const navigate = useNavigate();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [qrVehicle, setQrVehicle] = useState<Vehicle | null>(null);
	const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null);

	// Queries and mutations
	const { data, isLoading } = useVehicles({ page: 1, limit: 25 });
	const createMutation = useCreateVehicle();
	const deleteMutation = useDeleteVehicle();

	const handleCreate = async (formData: VehicleFormData) => {
		try {
			const result = await createMutation.mutateAsync(formData);
			setIsCreateDialogOpen(false);
			if (result.data?.id) {
				// Show QR so admin can immediately print & attach to motor
				setQrVehicle({ id: result.data.id, name: formData.name } as Vehicle);
			}
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Gagal menyimpan kendaraan',
				description: (error as Error).message,
			});
		}
	};

	const handleRowClick = (vehicle: Vehicle) => {
		navigate(`/vehicles/${vehicle.id}`);
	};

	const handleQrClick = (vehicle: Vehicle) => {
		setQrVehicle(vehicle);
	};

	const handleDelete = async () => {
		if (!deleteVehicle) return;
		try {
			await deleteMutation.mutateAsync(deleteVehicle.id);
			toast({ title: 'Kendaraan dihapus' });
			setDeleteVehicle(null);
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Gagal menghapus kendaraan',
				description: (error as Error).message,
			});
		}
	};

	return (
		<div className="space-y-6">
			<PageHeader
				title="Vehicles"
				description="Manage your fleet inventory and availability"
				actions={
					<Button onClick={() => setIsCreateDialogOpen(true)}>
						<Plus className="size-4 mr-2" />
						Add Vehicle
					</Button>
				}
			/>

			<VehicleTable
				data={data?.items ?? []}
				isLoading={isLoading}
				onRowClick={handleRowClick}
				onQrClick={handleQrClick}
				onDelete={setDeleteVehicle}
			/>

			{/* Create Dialog */}
			<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Add New Vehicle</DialogTitle>
					</DialogHeader>
					<VehicleForm
						onSubmit={handleCreate}
						onCancel={() => setIsCreateDialogOpen(false)}
						isLoading={createMutation.isPending}
					/>
				</DialogContent>
			</Dialog>

			{/* QR Code — shown after vehicle creation or when clicking Generate QR from list */}
			{qrVehicle && (
				<div className="rounded-lg border p-5 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-900">
					<div>
						<h3 className="text-base font-semibold">
							QR Code — {qrVehicle.name}
						</h3>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Print and attach this QR to the motor. Scan to see vehicle identity.
						</p>
					</div>
					<div className="flex items-center gap-3">
						<VehicleQrCard vehicleId={qrVehicle.id} vehicleName={qrVehicle.name} />
						<Button variant="ghost" size="sm" onClick={() => setQrVehicle(null)}>
							Close
						</Button>
					</div>
				</div>
			)}

			{/* Delete confirmation */}
			<ConfirmationDialog
				open={!!deleteVehicle}
				onOpenChange={(open) => !open && setDeleteVehicle(null)}
				title="Hapus Kendaraan"
				description={`Yakin hapus "${deleteVehicle?.name}" (${deleteVehicle?.plateNumber})? Tindakan ini tidak dapat dibatalkan. Kendaraan dengan booking aktif tidak dapat dihapus.`}
				confirmLabel="Hapus"
				variant="danger"
				onConfirm={handleDelete}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}