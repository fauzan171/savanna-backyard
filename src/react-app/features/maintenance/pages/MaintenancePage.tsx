import { useState } from 'react';
import { Plus, Wrench } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { EmptyState } from '@/react-app/components/ui/empty-state';
import {
	Select,
	SelectContent,
	SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/react-app/components/ui/select';
import { MaintenanceTable } from '../components/MaintenanceTable';
import { MaintenanceForm } from '../components/MaintenanceForm';
import {
    useMaintenanceList,
    useCreateMaintenance,
    useStartMaintenance,
    useCompleteMaintenance
} from '../hooks/useMaintenance';
import { useVehicles } from '@/react-app/features/vehicles/hooks/useVehicles';
import type { MaintenanceFormData, MaintenanceStatus, MaintenanceType } from '../types/maintenance.types';

export default function MaintenancePage() {
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | undefined>();
    const [typeFilter, setTypeFilter] = useState<MaintenanceType | undefined>();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const { data: maintenanceData, isLoading } = useMaintenanceList({
        page,
        limit: 25,
        status: statusFilter,
        type: typeFilter,
    });

    const { data: vehiclesData } = useVehicles({ limit: 100 });
    const createMutation = useCreateMaintenance();
    const startMutation = useStartMaintenance();
    const completeMutation = useCompleteMaintenance();

    const vehicles = vehiclesData?.items?.map((v) => ({
        id: v.id,
        name: v.name,
        plateNumber: v.plateNumber,
    }));

    const handleCreate = async (data: MaintenanceFormData) => {
        try {
            await createMutation.mutateAsync({
                vehicleId: data.vehicleId,
                type: data.type,
                description: data.description,
                cost: data.cost,
                startDate: data.startDate.toISOString().split('T')[0],
                endDate: data.endDate?.toISOString().split('T')[0],
                bookingId: data.bookingId,
                notes: data.notes,
            });
            // Show success feedback
            setIsFormOpen(false);
        } catch (error) {
            // Show error feedback
        }
    };

    const handleStart = async (id: string) => {
        try {
            await startMutation.mutateAsync(id);
            // Show success feedback
        } catch (error) {
            // Show error feedback
        }
    };

    const handleComplete = (id: string) => {
        setSelectedId(id);
        setCompleteDialogOpen(true);
    };

    const handleConfirmComplete = async () => {
        if (!selectedId) return;
        try {
            await completeMutation.mutateAsync({ id: selectedId });
            // Show success feedback
            setCompleteDialogOpen(false);
            setSelectedId(null);
        } catch (error) {
            // Show error feedback
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Maintenance</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Manage vehicle maintenance records
                    </p>
                </div>
                <Button onClick={() => setIsFormOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Maintenance
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <Select
                    value={statusFilter ?? 'all'}
                    onValueChange={(v) =>
                        setStatusFilter(v === 'all' ? undefined : (v as MaintenanceStatus))
                    }
                >
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="InProgress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={typeFilter ?? 'all'}
                    onValueChange={(v) =>
                        setTypeFilter(v === 'all' ? undefined : (v as MaintenanceType))
                    }
                >
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="Repair">Repair</SelectItem>
                        <SelectItem value="Damage">Damage</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {maintenanceData?.items && maintenanceData.items.length > 0 ? (
                <>
                    <MaintenanceTable
                        data={maintenanceData.items}
                        isLoading={isLoading}
                        onStart={handleStart}
                        onComplete={handleComplete}
                    />
                    {maintenanceData.meta.totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Page {page} of {maintenanceData.meta.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={page >= maintenanceData.meta.totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                !isLoading && (
                    <EmptyState
                        icon={<Wrench className="h-12 w-12" />}
                        title="No maintenance records"
                        description="Get started by creating your first maintenance record."
                        action={
                            <Button onClick={() => setIsFormOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Maintenance
                            </Button>
                        }
                    />
                )
            )}

            <MaintenanceForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSubmit={handleCreate}
                isLoading={createMutation.isPending}
                vehicles={vehicles}
            />

            {/* Complete Confirmation Dialog */}
            {completeDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold">Complete Maintenance</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Are you sure you want to mark this maintenance as completed?
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setCompleteDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleConfirmComplete}>
                                Complete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
