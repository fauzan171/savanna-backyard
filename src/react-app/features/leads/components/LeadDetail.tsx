import { Edit, ArrowRight, Phone, Mail, Calendar, Tag, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/react-app/components/ui/card';
import { Badge } from '@/react-app/components/ui/badge';
import { Button } from '@/react-app/components/ui/button';
import { Timeline } from '@/react-app/components/ui/timeline';
import type { LeadWithNotes, LeadStatus, LeadPriority } from '../types/lead.types';

interface LeadDetailProps {
	lead: LeadWithNotes;
	onEdit?: () => void;
	onConvert?: () => void;
}

const statusConfig: Record<LeadStatus, { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
	New: { variant: 'info', label: 'New' },
	Contacted: { variant: 'warning', label: 'Contacted' },
	Negotiating: { variant: 'warning', label: 'Negotiating' },
	Converted: { variant: 'success', label: 'Converted' },
	Lost: { variant: 'error', label: 'Lost' },
};

const priorityConfig: Record<LeadPriority, { color: string; label: string }> = {
	Hot: { color: 'text-red-500', label: '🔥 Hot' },
	Warm: { color: 'text-orange-500', label: 'Warm' },
	Cold: { color: 'text-blue-500', label: 'Cold' },
};

export function LeadDetail({ lead, onEdit, onConvert }: LeadDetailProps) {
	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});
	};

	const statusInfo = statusConfig[lead.status];
	const priorityInfo = priorityConfig[lead.priority];

	// Convert notes to timeline items
	const noteItems = lead.notes?.map((note) => ({
		id: note.id,
		title: note.createdBy.name,
		description: note.content,
		date: note.createdAt,
		status: 'completed' as const,
	})) ?? [];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div>
					<div className="flex items-center gap-3">
						<h2 className="text-2xl font-bold">{lead.name}</h2>
						<Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
					</div>
					<p className="text-muted-foreground mt-1">
						{lead.source} • <span className={priorityInfo.color}>{priorityInfo.label}</span>
					</p>
				</div>
				<div className="flex gap-2">
					{onEdit && lead.status !== 'Converted' && lead.status !== 'Lost' && (
						<Button variant="outline" onClick={onEdit}>
							<Edit className="size-4 mr-2" />
							Edit
						</Button>
					)}
					{onConvert && lead.status !== 'Converted' && lead.status !== 'Lost' && (
						<Button onClick={onConvert}>
							<ArrowRight className="size-4 mr-2" />
							Convert to Booking
						</Button>
					)}
				</div>
			</div>

			{/* Contact Info */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Contact Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-3">
						<Phone className="size-4 text-muted-foreground" />
						<span>{lead.phone}</span>
					</div>
					{lead.email && (
						<div className="flex items-center gap-3">
							<Mail className="size-4 text-muted-foreground" />
							<span>{lead.email}</span>
						</div>
					)}
					{lead.assignedTo && (
						<div className="flex items-center gap-3">
							<User className="size-4 text-muted-foreground" />
							<span>Assigned to: {lead.assignedTo.name}</span>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Follow-up Info */}
			{(lead.followUpDate || lead.convertedAt) && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Important Dates</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{lead.followUpDate && (
							<div className="flex items-center gap-3">
								<Calendar className="size-4 text-muted-foreground" />
								<div>
									<span className="text-muted-foreground text-sm">Follow-up: </span>
									<span className="font-medium">{formatDate(lead.followUpDate)}</span>
								</div>
							</div>
						)}
						{lead.convertedAt && (
							<div className="flex items-center gap-3">
								<Tag className="size-4 text-success" />
								<div>
									<span className="text-muted-foreground text-sm">Converted: </span>
									<span className="font-medium">{formatDate(lead.convertedAt)}</span>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Booking Reference */}
			{lead.booking && (
				<Card className="border-success/50 bg-success/5">
					<CardHeader>
						<CardTitle className="text-lg text-success">Converted to Booking</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">{lead.booking.bookingNumber}</p>
								<p className="text-sm text-muted-foreground">
									Status: {lead.booking.status}
								</p>
							</div>
							<div className="text-right">
								<p className="font-medium">
									{new Intl.NumberFormat('id-ID', {
										style: 'currency',
										currency: 'IDR',
										minimumFractionDigits: 0,
									}).format(lead.booking.totalAmount)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Notes Timeline */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Notes & Activity</CardTitle>
				</CardHeader>
				<CardContent>
					{noteItems.length > 0 ? (
						<Timeline items={noteItems} />
					) : (
						<p className="text-muted-foreground text-center py-4">
							No notes yet
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
