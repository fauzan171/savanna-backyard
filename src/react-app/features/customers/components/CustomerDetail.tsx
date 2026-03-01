import { Edit, Ban, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/react-app/components/ui/card';
import { Badge } from '@/react-app/components/ui/badge';
import { Button } from '@/react-app/components/ui/button';
import { Timeline } from '@/react-app/components/ui/timeline';
import type { CustomerWithHistory } from '../types/customer.types';

interface CustomerDetailProps {
	customer: CustomerWithHistory;
	onEdit?: () => void;
	onToggleBlacklist?: () => void;
}

export function CustomerDetail({ customer, onEdit, onToggleBlacklist }: CustomerDetailProps) {
	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});
	};

	// Convert rental history to timeline items
	const timelineItems = customer.rentalHistory?.map((rental) => ({
		id: rental.bookingId,
		title: rental.vehicleName,
		description: `${formatDate(rental.startDate)} - ${formatDate(rental.endDate)}`,
		status: (rental.status === 'Completed' ? 'completed' :
			   rental.status === 'Active' ? 'current' :
			   rental.status === 'Cancelled' ? 'error' : 'pending') as 'completed' | 'current' | 'error' | 'pending',
	})) ?? [];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div>
					<div className="flex items-center gap-3">
						<h2 className="text-2xl font-bold">{customer.name}</h2>
						{customer.isBlacklisted && (
							<Badge variant="error">Blacklisted</Badge>
						)}
					</div>
					<p className="text-muted-foreground mt-1">
						Customer since {formatDate(customer.createdAt)}
					</p>
				</div>
				<div className="flex gap-2">
					{onEdit && (
						<Button variant="outline" onClick={onEdit}>
							<Edit className="size-4 mr-2" />
							Edit
						</Button>
					)}
					{onToggleBlacklist && (
						<Button
							variant={customer.isBlacklisted ? 'outline' : 'destructive'}
							onClick={onToggleBlacklist}
						>
							<Ban className="size-4 mr-2" />
							{customer.isBlacklisted ? 'Remove Blacklist' : 'Blacklist'}
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
						<span>{customer.phone}</span>
					</div>
					{customer.email && (
						<div className="flex items-center gap-3">
							<Mail className="size-4 text-muted-foreground" />
							<span>{customer.email}</span>
						</div>
					)}
					{customer.address && (
						<div className="flex items-start gap-3">
							<MapPin className="size-4 text-muted-foreground mt-0.5" />
							<span>{customer.address}</span>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Identity Document */}
			{(customer.identityType || customer.identityNumber) && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Identity Document</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{customer.identityType && (
							<div className="flex items-center gap-3">
								<FileText className="size-4 text-muted-foreground" />
								<div>
									<span className="text-muted-foreground text-sm">Type: </span>
									<span className="font-medium">{customer.identityType}</span>
								</div>
							</div>
						)}
						{customer.identityNumber && (
							<div className="flex items-center gap-3">
								<FileText className="size-4 text-muted-foreground" />
								<div>
									<span className="text-muted-foreground text-sm">Number: </span>
									<span className="font-medium font-mono">{customer.identityNumber}</span>
								</div>
							</div>
						)}
						{customer.identityPhotoUrl && (
							<div className="mt-4">
								<p className="text-sm text-muted-foreground mb-2">Document Photo:</p>
								<img
									src={customer.identityPhotoUrl}
									alt="Identity document"
									className="max-w-xs rounded-lg border"
								/>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Blacklist Info */}
			{customer.isBlacklisted && customer.blacklistReason && (
				<Card className="border-error/50 bg-error/5">
					<CardHeader>
						<CardTitle className="text-lg text-error">Blacklist Reason</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-error">{customer.blacklistReason}</p>
					</CardContent>
				</Card>
			)}

			{/* Notes */}
			{customer.notes && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Notes</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="whitespace-pre-wrap">{customer.notes}</p>
					</CardContent>
				</Card>
			)}

			{/* Rental History */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Rental History</CardTitle>
				</CardHeader>
				<CardContent>
					{timelineItems && timelineItems.length > 0 ? (
						<Timeline items={timelineItems} />
					) : (
						<p className="text-muted-foreground text-center py-4">
							No rental history yet
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
