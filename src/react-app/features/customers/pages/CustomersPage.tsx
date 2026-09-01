import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';
import { ConfirmationDialog } from '@/react-app/components/ui/confirmation-dialog';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { toast } from '@/react-app/hooks/useToast';
import { extractApiError } from '@/react-app/lib/extract-error';
import { useCustomers, useCreateCustomer, useSetBlacklist } from '../hooks/useCustomers';
import { CustomerTable } from '../components/CustomerTable';
import { CustomerForm } from '../components/CustomerForm';
import type { Customer, CustomerFormData, SetBlacklistRequest } from '../types/customer.types';

export default function CustomersPage() {
	const navigate = useNavigate();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [blacklistCustomer, setBlacklistCustomer] = useState<Customer | null>(null);
	const [blacklistReason, setBlacklistReason] = useState('');

	// Queries and mutations
	const { data, isLoading } = useCustomers({ page: 1, limit: 25 });
	const createMutation = useCreateCustomer();
	const blacklistMutation = useSetBlacklist();

	const handleCreate = async (formData: CustomerFormData) => {
		try {
			const result = await createMutation.mutateAsync(formData);
			setIsCreateDialogOpen(false);
			toast({ title: 'Pelanggan berhasil dibuat' });
			// Navigate to the new customer's detail page
			if (result.data?.id) {
				navigate(`/customers/${result.data.id}`);
			}
		} catch (error) {
			toast({
				title: 'Gagal membuat pelanggan',
				description: extractApiError(error),
				variant: 'destructive',
			});
		}
	};

	const handleBlacklist = async () => {
		if (!blacklistCustomer) return;

		const data: SetBlacklistRequest = {
			isBlacklisted: !blacklistCustomer.isBlacklisted,
			reason: !blacklistCustomer.isBlacklisted ? blacklistReason : undefined,
		};

		try {
			await blacklistMutation.mutateAsync({ id: blacklistCustomer.id, ...data });
			setBlacklistCustomer(null);
			setBlacklistReason('');
		} catch (error) {
			toast({
				title: 'Gagal memperbarui blacklist',
				description: extractApiError(error),
				variant: 'destructive',
			});
		}
	};

	const handleRowClick = (customer: Customer) => {
		navigate(`/customers/${customer.id}`);
	};

	return (
		<div className="space-y-6">
			<PageHeader
				title="Pelanggan"
				description="Kelola data pelanggan, dokumen identitas, dan riwayat rental"
				actions={
					<Button onClick={() => setIsCreateDialogOpen(true)}>
						<Plus className="size-4 mr-2" />
						Tambah Pelanggan
					</Button>
				}
			/>

			<CustomerTable
				data={data?.items ?? []}
				isLoading={isLoading}
				onBlacklist={(customer) => {
					setBlacklistCustomer(customer);
					if (!customer.isBlacklisted) {
						setBlacklistReason('');
					}
				}}
				onRowClick={handleRowClick}
			/>

			{/* Create Dialog */}
			<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Tambah Pelanggan Baru</DialogTitle>
					</DialogHeader>
					<CustomerForm
						onSubmit={handleCreate}
						onCancel={() => setIsCreateDialogOpen(false)}
						isLoading={createMutation.isPending}
					/>
				</DialogContent>
			</Dialog>

			{/* Blacklist Confirmation Dialog */}
			<ConfirmationDialog
				open={!!blacklistCustomer}
				onOpenChange={(open) => {
					if (!open) {
						setBlacklistCustomer(null);
						setBlacklistReason('');
					}
				}}
				title={blacklistCustomer?.isBlacklisted ? 'Cabut Blacklist' : 'Tambah ke Blacklist'}
				description={
					blacklistCustomer?.isBlacklisted
						? `Cabut status blacklist untuk ${blacklistCustomer.name}? Setelah dicabut, pelanggan bisa membuat booking lagi.`
						: `Blacklist ${blacklistCustomer?.name}? Pelanggan ini tidak bisa membuat booking baru.`
				}
				confirmLabel={blacklistCustomer?.isBlacklisted ? 'Cabut Blacklist' : 'Blacklist'}
				variant={blacklistCustomer?.isBlacklisted ? 'default' : 'danger'}
				onConfirm={handleBlacklist}
				isLoading={blacklistMutation.isPending}
			>
				{!blacklistCustomer?.isBlacklisted && (
					<div className="mt-4">
						<label className="text-sm font-medium">Alasan (wajib)</label>
						<textarea
							value={blacklistReason}
							onChange={(e) => setBlacklistReason(e.target.value)}
							placeholder="Tulis alasan blacklist..."
							className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							rows={3}
						/>
					</div>
				)}
			</ConfirmationDialog>
		</div>
	);
}
