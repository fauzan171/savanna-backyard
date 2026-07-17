import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';
import { ConfirmationDialog } from '@/react-app/components/ui/confirmation-dialog';
import { Spinner } from '@/react-app/components/ui/spinner';
import { useCustomer, useUpdateCustomer, useSetBlacklist } from '../hooks/useCustomers';
import { CustomerDetail } from '../components/CustomerDetail';
import { CustomerForm } from '../components/CustomerForm';
import type { CustomerFormData, SetBlacklistRequest } from '../types/customer.types';
import { toast } from '@/react-app/hooks/useToast';

export default function CustomerDetailPage() {
	const { id } = useParams<{ id: string }>();
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [showBlacklistDialog, setShowBlacklistDialog] = useState(false);
	const [blacklistReason, setBlacklistReason] = useState('');

	// Queries and mutations
	const { data: customer, isLoading, error } = useCustomer(id!);
	const updateMutation = useUpdateCustomer();
	const blacklistMutation = useSetBlacklist();

	const handleUpdate = async (formData: CustomerFormData) => {
		try {
			await updateMutation.mutateAsync({ id: id!, data: formData });
			setIsEditDialogOpen(false);
		} catch (error) {
			toast({
				variant: 'destructive',
				description: (error as Error).message,
			});
		}
	};

	const handleBlacklist = async () => {
		if (!customer) return;

		const data: SetBlacklistRequest = {
			isBlacklisted: !customer.isBlacklisted,
			reason: !customer.isBlacklisted ? blacklistReason : undefined,
		};

		try {
			await blacklistMutation.mutateAsync({ id: customer.id, ...data });
			setShowBlacklistDialog(false);
			setBlacklistReason('');
		} catch (error) {
			toast({
				variant: 'destructive',
				description: (error as Error).message,
			});
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-16">
				<Spinner size="lg" />
			</div>
		);
	}

	if (error || !customer) {
		return (
			<div className="space-y-4">
				<Button variant="ghost" asChild>
					<Link to="/customers">
						<ArrowLeft className="size-4 mr-2" />
						Back to Customers
					</Link>
				</Button>
				<div className="rounded-lg border border-error/50 bg-error/10 p-6 text-center">
					<h2 className="text-lg font-semibold text-error">Customer Not Found</h2>
					<p className="text-muted-foreground mt-2">
						The customer you're looking for doesn't exist or has been deleted.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<Button variant="ghost" asChild>
				<Link to="/customers">
					<ArrowLeft className="size-4 mr-2" />
					Back to Customers
				</Link>
			</Button>

			<CustomerDetail
				customer={customer}
				onEdit={() => setIsEditDialogOpen(true)}
				onToggleBlacklist={() => setShowBlacklistDialog(true)}
			/>

			{/* Edit Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Edit Customer</DialogTitle>
					</DialogHeader>
					<CustomerForm
						customer={customer}
						onSubmit={handleUpdate}
						onCancel={() => setIsEditDialogOpen(false)}
						isLoading={updateMutation.isPending}
					/>
				</DialogContent>
			</Dialog>

			{/* Blacklist Confirmation Dialog */}
			<ConfirmationDialog
				open={showBlacklistDialog}
				onOpenChange={(open) => {
					if (!open) {
						setShowBlacklistDialog(false);
						setBlacklistReason('');
					}
				}}
				title={customer.isBlacklisted ? 'Remove from Blacklist' : 'Add to Blacklist'}
				description={
					customer.isBlacklisted
						? `Are you sure you want to remove ${customer.name} from the blacklist?`
						: `Are you sure you want to blacklist ${customer.name}? They will not be able to make new bookings.`
				}
				confirmLabel={customer.isBlacklisted ? 'Remove' : 'Blacklist'}
				variant={customer.isBlacklisted ? 'default' : 'danger'}
				onConfirm={handleBlacklist}
				isLoading={blacklistMutation.isPending}
			>
				{!customer.isBlacklisted && (
					<div className="mt-4">
						<label className="text-sm font-medium">Reason (required)</label>
						<textarea
							value={blacklistReason}
							onChange={(e) => setBlacklistReason(e.target.value)}
							placeholder="Enter reason for blacklisting..."
							className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							rows={3}
						/>
					</div>
				)}
			</ConfirmationDialog>
		</div>
	);
}
