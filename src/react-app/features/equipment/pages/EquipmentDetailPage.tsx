import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/react-app/components/ui/button';
import { Spinner } from '@/react-app/components/ui/spinner';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { Badge } from '@/react-app/components/ui/badge';
import { EquipmentForm } from '../components/EquipmentForm';
import { useEquipment, useUpdateEquipment, useDeleteEquipment } from '../hooks/useEquipment';
import { EQUIPMENT_CATEGORY_LABELS, formatCurrency, type EquipmentCategory, type UpdateEquipmentRequest } from '../types/equipment.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';

const CATEGORY_COLORS: Record<EquipmentCategory, string> = {
	Safety: 'bg-red-100 text-red-800 border-red-200',
	Apparel: 'bg-blue-100 text-blue-800 border-blue-200',
	Accessories: 'bg-purple-100 text-purple-800 border-purple-200',
	Electronics: 'bg-green-100 text-green-800 border-green-200',
};

export function EquipmentDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data: equipment, isLoading, error } = useEquipment(id!);
	const updateEquipment = useUpdateEquipment();
	const deleteEquipment = useDeleteEquipment();
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Spinner size="lg" />
			</div>
		);
	}

	if (error || !equipment) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
				<p className="text-muted-foreground">Equipment not found</p>
				<Button variant="outline" onClick={() => navigate('/equipment')}>
					<ArrowLeft className="size-4 mr-2" />
					Back to Equipment
				</Button>
			</div>
		);
	}

	const handleUpdate = async (data: UpdateEquipmentRequest) => {
		await updateEquipment.mutateAsync({ id: id!, data });
		setIsEditOpen(false);
	};

	const handleDelete = async () => {
		await deleteEquipment.mutateAsync(id!);
		navigate('/equipment');
	};

	return (
		<div className="space-y-6">
			<PageHeader
				title={equipment.name}
				breadcrumb={[
					{ label: 'Equipment', href: '/equipment' },
					{ label: equipment.name },
				]}
				actions={
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => setIsEditOpen(true)}>
							<Pencil className="size-4 mr-2" />
							Edit
						</Button>
						<Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
							<Trash2 className="size-4 mr-2" />
							Delete
						</Button>
					</div>
				}
			/>

			{/* Status Banner */}
			<div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
				<Badge variant="outline" className={CATEGORY_COLORS[equipment.category]}>
					{EQUIPMENT_CATEGORY_LABELS[equipment.category]}
				</Badge>
				<Badge variant="outline" className={equipment.isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}>
					{equipment.isActive ? 'Active' : 'Inactive'}
				</Badge>
				{equipment.stock === 0 && (
					<Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
						Out of Stock
					</Badge>
				)}
			</div>

			{/* Details Grid */}
			<div className="grid gap-6 md:grid-cols-2">
				<div className="space-y-4">
					<h3 className="font-semibold text-lg">Details</h3>
					<div className="space-y-3">
						<div>
							<p className="text-sm text-muted-foreground">Name</p>
							<p className="font-medium">{equipment.name}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Category</p>
							<p className="font-medium">{EQUIPMENT_CATEGORY_LABELS[equipment.category]}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Daily Rate</p>
							<p className="font-medium">{formatCurrency(equipment.dailyRateIdr)}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Stock</p>
							<p className="font-medium">{equipment.stock} units</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Min Rental Days</p>
							<p className="font-medium">{equipment.minRentalDays}</p>
						</div>
					</div>
				</div>

				<div className="space-y-4">
					<h3 className="font-semibold text-lg">Additional Info</h3>
					<div className="space-y-3">
						{equipment.description && (
							<div>
								<p className="text-sm text-muted-foreground">Description</p>
								<p className="font-medium">{equipment.description}</p>
							</div>
						)}
						{equipment.image && (
							<div>
								<p className="text-sm text-muted-foreground">Image</p>
								<img src={equipment.image} alt={equipment.name} className="mt-2 rounded-lg max-h-48 object-cover" />
							</div>
						)}
						<div>
							<p className="text-sm text-muted-foreground">Created</p>
							<p className="font-medium">{format(new Date(equipment.createdAt), 'PPP')}</p>
						</div>
						{equipment.updatedAt && (
							<div>
								<p className="text-sm text-muted-foreground">Last Updated</p>
								<p className="font-medium">{format(new Date(equipment.updatedAt), 'PPP')}</p>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Edit Dialog */}
			<Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit Equipment</DialogTitle>
					</DialogHeader>
					<EquipmentForm
						onSubmit={handleUpdate}
						onCancel={() => setIsEditOpen(false)}
						isLoading={updateEquipment.isPending}
						defaultValues={equipment}
					/>
				</DialogContent>
			</Dialog>

			{/* Delete Dialog */}
			<Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Equipment</DialogTitle>
					</DialogHeader>
					<p className="text-muted-foreground">
						Are you sure you want to delete <strong>{equipment.name}</strong>? This action cannot be undone.
					</p>
					<div className="flex justify-end gap-3">
						<Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
						<Button variant="destructive" onClick={handleDelete} disabled={deleteEquipment.isPending}>
							{deleteEquipment.isPending ? 'Deleting...' : 'Delete'}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
