import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';
import { Spinner } from '@/react-app/components/ui/spinner';
import { useLead, useUpdateLead } from '../hooks/useLeads';
import { LeadDetail } from '../components/LeadDetail';
import { LeadForm } from '../components/LeadForm';
import type { LeadFormData } from '../types/lead.types';

export default function LeadDetailPage() {
	const { id } = useParams<{ id: string }>();
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);

	// Queries and mutations
	const { data: lead, isLoading, error } = useLead(id!);
	const updateMutation = useUpdateLead();

	const handleUpdate = async (formData: LeadFormData) => {
		try {
			await updateMutation.mutateAsync({ id: id!, data: formData });
			setIsEditDialogOpen(false);
		} catch (error) {
			console.log(error)
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-16">
				<Spinner size="lg" />
			</div>
		);
	}

	if (error || !lead) {
		return (
			<div className="space-y-4">
				<Button variant="ghost" asChild>
					<Link to="/leads">
						<ArrowLeft className="size-4 mr-2" />
						Back to Leads
					</Link>
				</Button>
				<div className="rounded-lg border border-error/50 bg-error/10 p-6 text-center">
					<h2 className="text-lg font-semibold text-error">Lead Not Found</h2>
					<p className="text-muted-foreground mt-2">
						The lead you're looking for doesn't exist or has been deleted.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<Button variant="ghost" asChild>
				<Link to="/leads">
					<ArrowLeft className="size-4 mr-2" />
					Back to Leads
				</Link>
			</Button>

			<LeadDetail
				lead={lead}
				onEdit={() => setIsEditDialogOpen(true)}
				onConvert={() => setIsConvertDialogOpen(true)}
			/>

			{/* Edit Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Edit Lead</DialogTitle>
					</DialogHeader>
					<LeadForm
						lead={lead}
						onSubmit={handleUpdate}
						onCancel={() => setIsEditDialogOpen(false)}
						isLoading={updateMutation.isPending}
					/>
				</DialogContent>
			</Dialog>

			{/* Convert to Booking Dialog */}
			<Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Convert Lead to Booking</DialogTitle>
					</DialogHeader>
					<p className="text-muted-foreground">
						Convert <strong>{lead.name}</strong> to a booking. This feature requires the Booking module to be fully implemented.
					</p>
					<div className="flex justify-end gap-3">
						<Button variant="outline" onClick={() => setIsConvertDialogOpen(false)}>
							Cancel
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
