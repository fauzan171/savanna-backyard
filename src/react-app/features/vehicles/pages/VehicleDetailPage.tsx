import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';
import { Spinner } from '@/react-app/components/ui/spinner';
import { useVehicle, useUpdateVehicle, useUpdateVehicleStatus } from '../hooks/useVehicles';
import { VehicleDetail } from '../components/VehicleDetail';
import { VehicleForm } from '../components/VehicleForm';
import type { VehicleFormData, VehicleStatus } from '../types/vehicle.types';

export default function VehicleDetailPage() {
	const { id } = useParams<{ id: string }>();
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

	// Queries and mutations
	const { data: vehicle, isLoading, error } = useVehicle(id!);
	const updateMutation = useUpdateVehicle();
	const statusMutation = useUpdateVehicleStatus();

	const handleUpdate = async (formData: VehicleFormData) => {
		try {
			await updateMutation.mutateAsync({ id: id!, data: formData });
			setIsEditDialogOpen(false);
		} catch (error) {
			// Error is handled by the mutation
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-16">
				<Spinner size="lg" />
			</div>
		);
	}

	if (error || !vehicle) {
		return (
			<div className="space-y-4">
				<Button variant="ghost" asChild>
					<Link to="/vehicles">
						<ArrowLeft className="size-4 mr-2" />
						Back to Vehicles
					</Link>
				</Button>
				<div className="rounded-lg border border-error/50 bg-error/10 p-6 text-center">
					<h2 className="text-lg font-semibold text-error">Vehicle Not Found</h2>
					<p className="text-muted-foreground mt-2">
						The vehicle you're looking for doesn't exist or has been deleted.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<Button variant="ghost" asChild>
				<Link to="/vehicles">
					<ArrowLeft className="size-4 mr-2" />
					Back to Vehicles
				</Link>
			</Button>

			<VehicleDetail
				vehicle={vehicle}
				onEdit={() => setIsEditDialogOpen(true)}
				onStatusChange={() => setIsStatusDialogOpen(true)}
			/>

			{/* Edit Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Edit Vehicle</DialogTitle>
					</DialogHeader>
					<VehicleForm
						vehicle={vehicle}
						onSubmit={handleUpdate}
						onCancel={() => setIsEditDialogOpen(false)}
						isLoading={updateMutation.isPending}
					/>
				</DialogContent>
			</Dialog>

			{/* Status Change Dialog - simplified for now */}
			<Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change Vehicle Status</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<p className="text-muted-foreground">
							Select the new status for this vehicle.
						</p>
						<div className="grid grid-cols-2 gap-2">
							{(['Available', 'Rented', 'Maintenance', 'Inactive'] as VehicleStatus[]).map((status) => (
								<Button
									key={status}
									variant={vehicle.status === status ? 'default' : 'outline'}
									onClick={async () => {
										try {
											await statusMutation.mutateAsync({
												id: vehicle.id,
												status,
											});
											setIsStatusDialogOpen(false);
										} catch (error) {
											// Error handled
										}
									}}
									disabled={statusMutation.isPending}
								>
									{status}
								</Button>
							))}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
