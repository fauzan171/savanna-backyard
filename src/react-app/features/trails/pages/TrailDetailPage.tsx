import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { useTrail, useUpdateTrail, useDeleteTrail } from '../hooks/useTrails';
import { TrailForm } from '../components/TrailForm';
import type { CreateTrailRequest } from '../api/trails';

export default function TrailDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data: trail, isLoading } = useTrail(id!);
	const updateMutation = useUpdateTrail();
	const deleteMutation = useDeleteTrail();

	const handleUpdate = async (data: CreateTrailRequest) => {
		await updateMutation.mutateAsync({ id: id!, data });
	};

	const handleDelete = async () => {
		if (confirm('Delete this trail?')) {
			await deleteMutation.mutateAsync(id!);
			navigate('/trails');
		}
	};

	if (isLoading) return <div className="text-center py-8">Loading...</div>;
	if (!trail) return <div className="text-center py-8">Trail not found</div>;

	return (
		<div className="space-y-6">
			<PageHeader title={trail.name} description={trail.id} actions={
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => navigate('/trails')}><ArrowLeft className="size-4 mr-2" />Back</Button>
					<Button variant="destructive" onClick={handleDelete}><Trash2 className="size-4 mr-2" />Delete</Button>
				</div>
			} />
			<div className="bg-card border rounded-lg p-6">
				<TrailForm initialData={trail} onSubmit={handleUpdate} onCancel={() => navigate('/trails')} isLoading={updateMutation.isPending} />
			</div>
		</div>
	);
}
