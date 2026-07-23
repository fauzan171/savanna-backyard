import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Star, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { toast } from '@/react-app/hooks/useToast';
import { extractApiError } from '@/react-app/lib/extract-error';
import { useReviews, useToggleReview, useCreateReview } from '../hooks/useReviews';
import { ReviewForm } from '../components/ReviewForm';
import type { CreateReviewRequest } from '../api/reviews';

export default function ReviewsPage() {
	const navigate = useNavigate();
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const { data: reviews, isLoading } = useReviews();
	const toggleMutation = useToggleReview();
	const createMutation = useCreateReview();

	const handleCreate = async (data: CreateReviewRequest) => {
		try {
			await createMutation.mutateAsync(data);
			setIsCreateOpen(false);
			toast({ title: 'Review created' });
		} catch (error) {
			toast({
				title: 'Failed to create review',
				description: extractApiError(error),
				variant: 'destructive',
			});
		}
	};

	return (
		<div className="space-y-6">
			<PageHeader title="Reviews" description="Manage customer reviews and testimonials" actions={
				<Button onClick={() => setIsCreateOpen(true)}><Plus className="size-4 mr-2" />Add Review</Button>
			} />
			{isLoading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full size-8 border-b-2 border-primary" /></div> : (
				<div className="border rounded-lg overflow-x-auto">
					<table className="w-full">
						<thead className="bg-muted/50">
							<tr>
								<th className="text-left p-3 text-sm font-medium">Name</th>
								<th className="text-left p-3 text-sm font-medium">Rating</th>
								<th className="text-left p-3 text-sm font-medium">Location</th>
								<th className="text-left p-3 text-sm font-medium">Review</th>
								<th className="text-left p-3 text-sm font-medium">Status</th>
								<th className="text-left p-3 text-sm font-medium">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{(reviews ?? []).map((r) => (
								<tr key={r.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/reviews/${r.id}`)}>
									<td className="p-3"><div className="font-medium">{r.name}</div>{r.avatar && <div className="text-xs text-muted-foreground">{r.avatar}</div>}</td>
									<td className="p-3">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="size-3 fill-yellow-400 text-yellow-400 inline" />)}</td>
									<td className="p-3 text-sm">{r.location ?? '-'}</td>
									<td className="p-3 text-sm max-w-xs truncate">{r.text}</td>
									<td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${r.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.isPublished ? 'Published' : 'Draft'}</span></td>
									<td className="p-3"><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(r.id); }}>{r.isPublished ? <Eye className="size-4" /> : <EyeOff className="size-4 text-gray-400" />}</Button></td>
								</tr>
							))}
						</tbody>
					</table>
					{(!reviews || reviews.length === 0) && <div className="text-center py-8 text-muted-foreground">No reviews found</div>}
				</div>
			)}
			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader><DialogTitle>Add New Review</DialogTitle></DialogHeader>
					<ReviewForm onSubmit={handleCreate} onCancel={() => setIsCreateOpen(false)} isLoading={createMutation.isPending} />
				</DialogContent>
			</Dialog>
		</div>
	);
}
