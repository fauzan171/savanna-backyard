import { useParams, Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Skeleton } from '@/react-app/components/ui/skeleton';
import { MaintenanceDetail } from '../components/MaintenanceDetail';
import { useMaintenance, useStartMaintenance, useCompleteMaintenance } from '../hooks/useMaintenance';

export default function MaintenanceDetailPage() {
	const { id } = useParams<{ id: string }>();

	const { data: maintenance, isLoading } = useMaintenance(id!);
	const startMutation = useStartMaintenance();
	const completeMutation = useCompleteMaintenance();

	const handleStart = async () => {
		if (!id) return;
		try {
		 await startMutation.mutateAsync(id);
        // Success feedback would go to UI
	 } catch (error) {
        // Error feedback would go to UI
    }
    };

    const handleComplete = async () => {
        if (!id) return;
        try {
            await completeMutation.mutateAsync({ id });
            // Success feedback would go to UI
        } catch (error) {
            // Error feedback would go to UI
    }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (!maintenance) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" asChild>
                    <Link to="/maintenance">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Maintenance
                    </Link>
                </Button>
                <div className="flex h-[400px] items-center justify-center rounded-lg border">
                    <p className="text-muted-foreground">Maintenance record not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" asChild>
                        <Link to="/maintenance">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Maintenance
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Maintenance Details
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            View and manage maintenance record
                        </p>
                    </div>
                </div>
            </div>

            <MaintenanceDetail
                data={maintenance}
                isLoading={isLoading}
                onStart={handleStart}
                onComplete={handleComplete}
            />
        </div>
    );
}
