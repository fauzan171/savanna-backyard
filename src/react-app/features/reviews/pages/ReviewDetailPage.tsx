import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { useReview, useUpdateReview, useDeleteReview } from '../hooks/useReviews';
import { ReviewForm } from '../components/ReviewForm';
import type { CreateReviewRequest } from '../api/reviews';

export default function ReviewDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data: review, isLoading } = useReview(id!);
	const updateMutation = useUpdateReview();
	const deleteMutation = useDeleteReview();

	const handleUpdate = async (data: CreateReviewRequest) => {
		await updateMutation.mutateAsync({ id: id!, data });
	};

	const handleDelete = async () => {
		if (confirm('Delete this review?')) {
			await deleteMutation.mutateAsync(id!);
			navigate('/reviews');
		}
	};

	if (isLoading) return <div className="text-center py-8">Loading...</div>;
	if (!review) return <div className="text-center py-8">Review not found</div>;

	return (
		<div className="space-y-6">
			<PageHeader title={review.name} description={`Rating: ${'★'.repeat(review.rating)}`} actions={
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => navigate('/reviews')}><ArrowLeft className="size-4 mr-2" />Back</Button>
					<Button variant="destructive" onClick={handleDelete}><Trash2 className="size-4 mr-2" />Delete</Button>
				</div>
			} />
			<div className="bg-card border rounded-lg p-6">
				<ReviewForm initialData={review} onSubmit={handleUpdate} onCancel={() => navigate('/reviews')} isLoading={updateMutation.isPending} />
			</div>
		</div>
	);
}
