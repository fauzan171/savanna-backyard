import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { usePricingTier, useUpdatePricing, useDeletePricing } from '../hooks/usePricing';
import { PricingForm } from '../components/PricingForm';
import type { CreatePricingRequest } from '../api/pricing';

export default function PricingDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data: tier, isLoading } = usePricingTier(id!);
	const updateMutation = useUpdatePricing();
	const deleteMutation = useDeletePricing();

	const handleUpdate = async (data: CreatePricingRequest) => {
		await updateMutation.mutateAsync({ id: id!, data });
	};

	const handleDelete = async () => {
		if (confirm('Delete this pricing tier?')) {
			await deleteMutation.mutateAsync(id!);
			navigate('/pricing');
		}
	};

	if (isLoading) return <div className="text-center py-8">Loading...</div>;
	if (!tier) return <div className="text-center py-8">Pricing tier not found</div>;

	return (
		<div className="space-y-6">
			<PageHeader title={tier.name} actions={
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => navigate('/pricing')}><ArrowLeft className="size-4 mr-2" />Back</Button>
					<Button variant="destructive" onClick={handleDelete}><Trash2 className="size-4 mr-2" />Delete</Button>
				</div>
			} />
			<div className="bg-card border rounded-lg p-6">
				<PricingForm initialData={tier} onSubmit={handleUpdate} onCancel={() => navigate('/pricing')} isLoading={updateMutation.isPending} />
			</div>
		</div>
	);
}
