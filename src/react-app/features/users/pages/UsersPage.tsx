import { useState } from 'react';
import { Plus, ToggleLeft, ToggleRight, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/react-app/components/ui/dialog';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { useUsers, useCreateUser, useToggleUser, useUpdateUser } from '../hooks/useUsers';
import { toast } from '@/react-app/hooks/useToast';
import type { CreateUserRequest } from '../api/users';

function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
	const createMutation = useCreateUser();
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<CreateUserRequest>();

	const onSubmit = async (data: CreateUserRequest) => {
		try {
			await createMutation.mutateAsync(data);
			reset();
			onOpenChange(false);
			toast({ title: 'User dibuat' });
		} catch (error) {
			toast({ variant: 'destructive', title: 'Gagal membuat user', description: (error as Error).message });
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader><DialogTitle>Create Staff User</DialogTitle></DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<div className="space-y-1">
						<label className="text-sm font-medium">Name</label>
						<Input {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Min 2 characters' } })} />
						{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
					</div>
					<div className="space-y-1">
						<label className="text-sm font-medium">Email</label>
						<Input type="email" {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })} />
						{errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
					</div>
					<div className="space-y-1">
						<label className="text-sm font-medium">Password</label>
						<Input
							type="password"
							{...register('password', {
								required: 'Password is required',
								minLength: { value: 8, message: 'Min 8 characters' },
								validate: {
									hasLetter: (v) => /[A-Za-z]/.test(v) || 'Must contain a letter',
									hasNumber: (v) => /[0-9]/.test(v) || 'Must contain a number',
								},
							})}
						/>
						{errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
						<p className="text-xs text-muted-foreground">Min 8 karakter, huruf & angka.</p>
					</div>
					<div className="space-y-1">
						<label className="text-sm font-medium">Role</label>
						<select {...register('role')} className="w-full border rounded-md px-3 py-2 text-sm">
							<option value="STAFF">Staff</option>
							<option value="SUPER_ADMIN">Super Admin</option>
						</select>
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
						<Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create User'}</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function UsersPage() {
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<any>(null);
	const { data: users, isLoading } = useUsers();
	const toggleMutation = useToggleUser();
	const updateMutation = useUpdateUser();

	return (
		<div className="space-y-6">
			<PageHeader title="Users" description="Manage admin users" actions={
				<Button onClick={() => setIsCreateOpen(true)}><Plus className="size-4 mr-2" />Add User</Button>
			} />

			{isLoading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full size-8 border-b-2 border-primary" /></div> : (
				<div className="border rounded-lg overflow-x-auto">
					<table className="w-full">
						<thead className="bg-muted/50">
							<tr>
								<th className="text-left p-3 text-sm font-medium">Name</th>
								<th className="text-left p-3 text-sm font-medium">Email</th>
								<th className="text-left p-3 text-sm font-medium">Role</th>
								<th className="text-left p-3 text-sm font-medium">Status</th>
								<th className="text-left p-3 text-sm font-medium">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{(users ?? []).map((user) => (
								<tr key={user.id} className="hover:bg-muted/30">
									<td className="p-3 font-medium">{user.name}</td>
									<td className="p-3 text-sm">{user.email}</td>
									<td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{user.role}</span></td>
									<td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
									<td className="p-3 flex gap-1">
									<Button variant="ghost" size="sm" onClick={() => setEditingUser(user)}><Pencil className="size-4" /></Button>
									<Button variant="ghost" size="sm" onClick={() => { if (window.confirm(`Deactivate ${user.name}? They won't be able to log in.`)) toggleMutation.mutate(user.id); }}><Trash2 className="size-4 text-destructive" /></Button>
									<Button variant="ghost" size="sm" onClick={() => toggleMutation.mutate(user.id)}>{user.isActive ? <ToggleRight className="size-4 text-green-600" /> : <ToggleLeft className="size-4 text-gray-400" />}</Button>
								</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			{editingUser && (
				<Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
					<DialogContent>
						<DialogHeader><DialogTitle>Edit User: {editingUser.name}</DialogTitle></DialogHeader>
						<form onSubmit={async (e) => {
							e.preventDefault();
							const fd = new FormData(e.target as HTMLFormElement);
							const name = (fd.get('name') as string || '').trim();
							const email = (fd.get('email') as string || '').trim();
							const role = fd.get('role') as string;
							if (!name || !email) return;
							try {
								await updateMutation.mutateAsync({ id: editingUser.id, data: { name, email, role } });
								setEditingUser(null);
								toast({ title: 'User updated' });
							} catch (err) {
								toast({ variant: 'destructive', title: 'Gagal update', description: (err as Error).message });
							}
						}} className="space-y-4">
							<div className="space-y-1">
								<label className="text-sm font-medium">Name</label>
								<Input name="name" defaultValue={editingUser.name} required />
							</div>
							<div className="space-y-1">
								<label className="text-sm font-medium">Email</label>
								<Input name="email" type="email" defaultValue={editingUser.email} required />
							</div>
							<div className="space-y-1">
								<label className="text-sm font-medium">Role</label>
								<select name="role" defaultValue={editingUser.role} className="w-full border rounded-md px-3 py-2 text-sm">
									<option value="STAFF">Staff</option>
									<option value="SUPER_ADMIN">Super Admin</option>
								</select>
							</div>
							<div className="flex justify-end gap-2">
								<Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
								<Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Saving...' : 'Save'}</Button>
							</div>
						</form>
					</DialogContent>
				</Dialog>
			)}
			<CreateUserDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
		</div>
	);
}
