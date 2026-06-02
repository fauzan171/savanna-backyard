import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ToggleLeft, ToggleRight, Crown } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { usePricingTiers, useTogglePricing, useCreatePricing } from '../hooks/usePricing';
import { PricingForm } from '../components/PricingForm';
import type { CreatePricingRequest } from '../api/pricing';

export default function PricingPage() {
	const navigate = useNavigate();
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const { data: tiers, isLoading } = usePricingTiers();
	const toggleMutation = useTogglePricing();
	const createMutation = useCreatePricing();

	const handleCreate = async (data: CreatePricingRequest) => {
		const result = await createMutation.mutateAsync(data);
		setIsCreateOpen(false);
		if (result.data?.id) navigate(`/pricing/${result.data.id}`);
	};

	return (
		<div className="space-y-6">
			<PageHeader title="Pricing Tiers" description="Manage rental pricing tiers" actions={
				<Button onClick={() => setIsCreateOpen(true)}><Plus className="size-4 mr-2" />Add Tier</Button>
			} />
			{isLoading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{(tiers ?? []).map((tier) => (
						<div key={tier.id} className={`bg-card border rounded-lg p-6 cursor-pointer hover:shadow-md transition ${tier.highlighted ? 'ring-2 ring-primary' : ''}`} onClick={() => navigate(`/pricing/${tier.id}`)}>
							<div className="flex items-center justify-between mb-2">
								<h3 className="font-semibold text-lg">{tier.name}</h3>
								{tier.highlighted && <Crown className="size-4 text-yellow-500" />}
							</div>
							{tier.description && <p className="text-sm text-muted-foreground mb-3">{tier.description}</p>}
							<div className="space-y-1">
								<div className="text-2xl font-bold">Rp {tier.dailyPrice.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/day</span></div>
								<div className="text-sm text-muted-foreground">Rp {tier.multiDayPrice.toLocaleString()}/multi-day</div>
							</div>
							<div className="flex items-center justify-between mt-4">
								<span className={`text-xs px-2 py-1 rounded-full ${tier.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{tier.isActive ? 'Active' : 'Inactive'}</span>
								<Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(tier.id); }}>
									{tier.isActive ? <ToggleRight className="size-4 text-green-600" /> : <ToggleLeft className="size-4 text-gray-400" />}
								</Button>
							</div>
						</div>
					))}
				</div>
			)}
			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader><DialogTitle>Add Pricing Tier</DialogTitle></DialogHeader>
					<PricingForm onSubmit={handleCreate} onCancel={() => setIsCreateOpen(false)} isLoading={createMutation.isPending} />
				</DialogContent>
			</Dialog>
		</div>
	);
}
