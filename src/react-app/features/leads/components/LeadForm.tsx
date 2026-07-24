import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Textarea } from '@/react-app/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/react-app/components/ui/select';
import { FormField } from '@/react-app/components/ui/form-field';
import type { Lead, LeadFormData, LeadSource, LeadPriority } from '../types/lead.types';

const leadFormSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters').max(100),
	phone: z.string().min(5, 'Phone number is required'),
	email: z.string().email('Invalid email address').optional().or(z.literal('')),
	source: z.enum(['WhatsApp', 'Instagram', 'Facebook', 'TikTok', 'Website', 'WalkIn']),
	priority: z.enum(['Hot', 'Warm', 'Cold']).default('Warm'),
	notes: z.string().optional(),
	followUpDate: z.string().optional(),
});

interface LeadFormProps {
	lead?: Lead;
	onSubmit: (data: LeadFormData) => Promise<void>;
	onCancel?: () => void;
	isLoading?: boolean;
}

const leadSources: { value: LeadSource; label: string }[] = [
	{ value: 'WhatsApp', label: 'WhatsApp' },
	{ value: 'Instagram', label: 'Instagram' },
	{ value: 'Facebook', label: 'Facebook' },
	{ value: 'TikTok', label: 'TikTok' },
	{ value: 'Website', label: 'Website' },
	{ value: 'WalkIn', label: 'Walk-in' },
];

const leadPriorities: { value: LeadPriority; label: string }[] = [
	{ value: 'Hot', label: '🔥 Hot' },
	{ value: 'Warm', label: 'Warm' },
	{ value: 'Cold', label: 'Cold' },
];

export function LeadForm({ lead, onSubmit, onCancel, isLoading }: LeadFormProps) {
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setValue,
		watch,
		reset,
	} = useForm<LeadFormData>({
		resolver: zodResolver(leadFormSchema),
		defaultValues: {
			name: '',
			phone: '',
			email: '',
			source: 'WhatsApp',
			priority: 'Warm',
			notes: '',
			followUpDate: '',
		},
	});

	// Reset form when lead changes (for edit mode)
	useEffect(() => {
		if (lead) {
			reset({
				name: lead.name,
				phone: lead.phone,
				email: lead.email ?? '',
				source: lead.source,
				priority: lead.priority,
				// BUG#9: was hardcoded '' — wiped existing notes on edit. Preserve them.
				notes: lead.notes ?? '',
				followUpDate: lead.followUpDate ?? '',
			});
		}
	}, [lead, reset]);

	const source = watch('source');
	const priority = watch('priority');

	const onFormSubmit = async (data: LeadFormData) => {
		const cleanData = {
			...data,
			email: data.email || undefined,
			notes: data.notes || undefined,
			followUpDate: data.followUpDate || undefined,
		};
		await onSubmit(cleanData);
	};

	return (
		<form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2">
				<FormField label="Name" required error={errors.name?.message}>
					<Input
						{...register('name')}
						placeholder="John Doe"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>

				<FormField label="Phone" required error={errors.phone?.message}>
					<Input
						{...register('phone')}
						placeholder="+6281234567890"
						disabled={isLoading || isSubmitting}
					/>
				</FormField>
			</div>

			<FormField label="Email" error={errors.email?.message}>
				<Input
					{...register('email')}
					type="email"
					placeholder="john@example.com"
					disabled={isLoading || isSubmitting}
				/>
			</FormField>

			<div className="grid gap-4 md:grid-cols-2">
				<FormField label="Source" required error={errors.source?.message}>
					<Select
						value={source}
						onValueChange={(value) => setValue('source', value as LeadSource)}
						disabled={isLoading || isSubmitting}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select source" />
						</SelectTrigger>
						<SelectContent>
							{leadSources.map((src) => (
								<SelectItem key={src.value} value={src.value}>
									{src.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FormField>

				<FormField label="Priority" error={errors.priority?.message}>
					<Select
						value={priority}
						onValueChange={(value) => setValue('priority', value as LeadPriority)}
						disabled={isLoading || isSubmitting}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select priority" />
						</SelectTrigger>
						<SelectContent>
							{leadPriorities.map((pri) => (
								<SelectItem key={pri.value} value={pri.value}>
									{pri.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FormField>
			</div>

			<FormField label="Follow-up Date" error={errors.followUpDate?.message}>
				<Input
					{...register('followUpDate')}
					type="date"
					disabled={isLoading || isSubmitting}
				/>
			</FormField>

			<FormField label="Notes" error={errors.notes?.message}>
				<Textarea
					{...register('notes')}
					placeholder="Initial inquiry details..."
					rows={3}
					disabled={isLoading || isSubmitting}
				/>
			</FormField>

			<div className="flex justify-end gap-3 pt-4">
				{onCancel && (
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={isLoading || isSubmitting}
					>
						Cancel
					</Button>
				)}
				<Button type="submit" disabled={isLoading || isSubmitting}>
					{isSubmitting ? 'Saving...' : lead ? 'Update Lead' : 'Create Lead'}
				</Button>
			</div>
		</form>
	);
}
