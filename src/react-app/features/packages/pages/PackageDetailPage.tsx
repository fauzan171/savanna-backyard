import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { usePackage, useUpdatePackage, useDeletePackage } from '../hooks/usePackages';
import { PackageForm } from '../components/PackageForm';
import type { CreatePackageRequest } from '../api/packages';

export default function PackageDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data: pkg, isLoading } = usePackage(id!);
	const updateMutation = useUpdatePackage();
	const deleteMutation = useDeletePackage();

	const handleUpdate = async (data: CreatePackageRequest) => {
		await updateMutation.mutateAsync({ id: id!, data });
	};

	const handleDelete = async () => {
		if (confirm('Are you sure you want to delete this package?')) {
			await deleteMutation.mutateAsync(id!);
			navigate('/packages');
		}
	};

	if (isLoading) return <div className="text-center py-8">Loading...</div>;
	if (!pkg) return <div className="text-center py-8">Package not found</div>;

	return (
		<div className="space-y-6">
			<PageHeader title={pkg.name} description={pkg.tagline ?? undefined} actions={
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => navigate('/packages')}><ArrowLeft className="size-4 mr-2" />Back</Button>
					<Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}><Trash2 className="size-4 mr-2" />Delete</Button>
				</div>
			} />
			<div className="bg-card border rounded-lg p-6">
				<PackageForm initialData={pkg} onSubmit={handleUpdate} onCancel={() => navigate('/packages')} isLoading={updateMutation.isPending} />
			</div>
		</div>
	);
}
