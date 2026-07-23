import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { toast } from '@/react-app/hooks/useToast';
import { extractApiError } from '@/react-app/lib/extract-error';
import { useVehicles, useCreateVehicle } from '../hooks/useVehicles';
import { VehicleTable } from '../components/VehicleTable';
import { VehicleForm } from '../components/VehicleForm';
import type { Vehicle, VehicleFormData } from '../types/vehicle.types';

export default function VehiclesPage() {
	const navigate = useNavigate();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	// Queries and mutations
	const { data, isLoading } = useVehicles({ page: 1, limit: 25 });
	const createMutation = useCreateVehicle();

	const handleCreate = async (formData: VehicleFormData) => {
		try {
			const result = await createMutation.mutateAsync(formData);
			setIsCreateDialogOpen(false);
			if (result.data?.id) {
				navigate(`/vehicles/${result.data.id}`);
			}
		} catch (error) {
			toast({
				title: 'Failed to create vehicle',
				description: extractApiError(error),
				variant: 'destructive',
			});
		}
	};

	const handleRowClick = (vehicle: Vehicle) => {
		navigate(`/vehicles/${vehicle.id}`);
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
		</div>
	);
}
