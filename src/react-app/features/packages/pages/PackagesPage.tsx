import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { usePackages, useTogglePackage, useCreatePackage } from '../hooks/usePackages';
import { PackageForm } from '../components/PackageForm';
import type { Package, CreatePackageRequest } from '../api/packages';

export default function PackagesPage() {
	const navigate = useNavigate();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const { data: packages, isLoading } = usePackages();
	const toggleMutation = useTogglePackage();
	const createMutation = useCreatePackage();

	const handleCreate = async (formData: CreatePackageRequest) => {
		try {
			const result = await createMutation.mutateAsync(formData);
			setIsCreateDialogOpen(false);
			if (result.data?.id) navigate(`/packages/${result.data.id}`);
		} catch (error) {
			console.error(error);
		}
	};

	const handleToggle = async (pkg: Package) => {
		await toggleMutation.mutateAsync(pkg.id);
	};

	return (
		<div className="space-y-6">
			<PageHeader title="Packages" description="Manage tour packages" actions={
				<Button onClick={() => setIsCreateDialogOpen(true)}>
					<Plus className="size-4 mr-2" /> Add Package
				</Button>
			} />

			{isLoading ? (
				<div className="text-center py-8 text-muted-foreground">Loading...</div>
			) : (
				<div className="border rounded-lg">
					<table className="w-full">
						<thead className="bg-muted/50">
							<tr>
								<th className="text-left p-3 text-sm font-medium">Name</th>
								<th className="text-left p-3 text-sm font-medium">Duration</th>
								<th className="text-left p-3 text-sm font-medium">Price</th>
								<th className="text-left p-3 text-sm font-medium">Status</th>
								<th className="text-left p-3 text-sm font-medium">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{(packages ?? []).map((pkg) => (
								<tr key={pkg.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/packages/${pkg.id}`)}>
									<td className="p-3">
										<div><span className="font-medium">{pkg.name}</span></div>
										{pkg.tagline && <div className="text-sm text-muted-foreground">{pkg.tagline}</div>}
									</td>
									<td className="p-3 text-sm">{pkg.duration ?? '-'}</td>
									<td className="p-3 text-sm">{pkg.price === 0 ? 'Contact' : `Rp ${pkg.price.toLocaleString()}`}</td>
									<td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${pkg.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{pkg.isActive ? 'Active' : 'Inactive'}</span></td>
									<td className="p-3">
										<Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleToggle(pkg); }}>
											{pkg.isActive ? <ToggleRight className="size-4 text-green-600" /> : <ToggleLeft className="size-4 text-gray-400" />}
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					{(!packages || packages.length === 0) && <div className="text-center py-8 text-muted-foreground">No packages found</div>}
				</div>
			)}

			<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader><DialogTitle>Add New Package</DialogTitle></DialogHeader>
					<PackageForm onSubmit={handleCreate} onCancel={() => setIsCreateDialogOpen(false)} isLoading={createMutation.isPending} />
				</DialogContent>
			</Dialog>
		</div>
	);
}
