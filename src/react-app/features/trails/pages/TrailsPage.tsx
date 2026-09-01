import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { useTrails, useToggleTrail, useCreateTrail } from '../hooks/useTrails';
import { TrailForm } from '../components/TrailForm';
import type { CreateTrailRequest } from '../api/trails';
import { toast } from '@/react-app/hooks/useToast';

const difficultyColor: Record<string, string> = {
	Easy: 'bg-green-100 text-green-700',
	Moderate: 'bg-yellow-100 text-yellow-700',
	Hard: 'bg-orange-100 text-orange-700',
	Extreme: 'bg-red-100 text-red-700',
};

export default function TrailsPage() {
	const navigate = useNavigate();
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const { data: trails, isLoading } = useTrails();
	const toggleMutation = useToggleTrail();
	const createMutation = useCreateTrail();

	const handleCreate = async (data: CreateTrailRequest) => {
		try {
			const result = await createMutation.mutateAsync(data);
			setIsCreateOpen(false);
			if (result.data?.id) navigate(`/trails/${result.data.id}`);
		} catch (error) {
			toast({ variant: 'destructive', description: (error as Error).message });
		}
	};

	return (
		<div className="space-y-6">
			<PageHeader title="Rute" description="Kelola rute perjalanan dan konten blog untuk website" actions={
				<Button onClick={() => setIsCreateOpen(true)}><Plus className="size-4 mr-2" />Tambah Rute</Button>
			} />
			{isLoading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full size-8 border-b-2 border-primary" /></div> : (
				<div className="border rounded-lg overflow-x-auto">
					<table className="w-full">
						<thead className="bg-muted/50">
							<tr>
								<th className="text-left p-3 text-sm font-medium">Rute</th>
								<th className="text-left p-3 text-sm font-medium">Tingkat Kesulitan</th>
								<th className="text-left p-3 text-sm font-medium">Durasi</th>
								<th className="text-left p-3 text-sm font-medium">Jarak</th>
								<th className="text-left p-3 text-sm font-medium">Status</th>
								<th className="text-left p-3 text-sm font-medium">Aksi</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{(trails ?? []).map((trail) => (
								<tr key={trail.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/trails/${trail.id}`)}>
									<td className="p-3"><div className="font-medium">{trail.name}</div>{trail.terrain && <div className="text-xs text-muted-foreground">{trail.terrain}</div>}</td>
									<td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${difficultyColor[trail.difficulty ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>{trail.difficulty ?? '-'}</span></td>
									<td className="p-3 text-sm">{trail.estimatedDuration ?? '-'}</td>
									<td className="p-3 text-sm">{trail.distance ?? '-'}</td>
									<td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${trail.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{trail.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
									<td className="p-3"><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(trail.id); }}>{trail.isActive ? <ToggleRight className="size-4 text-green-600" /> : <ToggleLeft className="size-4 text-gray-400" />}</Button></td>
								</tr>
							))}
						</tbody>
					</table>
					{(!trails || trails.length === 0) && <div className="text-center py-8 text-muted-foreground">Belum ada rute</div>}
				</div>
			)}
			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
					<DialogHeader><DialogTitle>Tambah Rute Baru</DialogTitle></DialogHeader>
					<TrailForm isNew onSubmit={handleCreate} onCancel={() => setIsCreateOpen(false)} isLoading={createMutation.isPending} />
				</DialogContent>
			</Dialog>
		</div>
	);
}
