import { format } from 'date-fns';
import { Link } from 'react-router';
import { Calendar, Wrench, DollarSign, Car, FileText, User } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/react-app/components/ui/card';
import { Badge } from '@/react-app/components/ui/badge';
import { Button } from '@/react-app/components/ui/button';
import { Skeleton } from '@/react-app/components/ui/skeleton';
import type { MaintenanceWithDetails, MaintenanceStatus, MaintenanceType } from '../types/maintenance.types';

interface MaintenanceDetailProps {
	data: MaintenanceWithDetails | undefined;
	isLoading: boolean;
	onStart?: () => void;
	onComplete?: () => void;
}

const typeVariantMap: Record<MaintenanceType, 'default' | 'success' | 'error' | 'warning' | 'info' | 'outline' | 'primary'> = {
	Scheduled: 'info',
	Repair: 'warning',
	Damage: 'error',
};

const statusVariantMap: Record<MaintenanceStatus, 'default' | 'success' | 'error' | 'warning' | 'info' | 'outline' | 'primary'> = {
	Scheduled: 'outline',
	InProgress: 'warning',
	Completed: 'success',
};

const formatCurrency = (amount: number | null) => {
	if (amount === null) return '-';
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		minimumFractionDigits: 0,
	}).format(amount);
};

export function MaintenanceDetail({ data, isLoading, onStart, onComplete }: MaintenanceDetailProps) {
	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-48" />
				</CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-4 w-1/2" />
				</CardContent>
			</Card>
		);
	}

	if (!data) {
		return (
			<Card>
				<CardContent className="flex h-[200px] items-center justify-center">
					<p className="text-muted-foreground">Maintenance record not found</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-start justify-between">
				<div className="space-y-1">
					<CardTitle className="flex items-center gap-2">
						<Wrench className="h-5 w-5" />
						Maintenance Details
					</CardTitle>
					<div className="flex items-center gap-2">
						<Badge variant={typeVariantMap[data.type]}>{data.type}</Badge>
						<Badge variant={statusVariantMap[data.status]}>{data.status}</Badge>
					</div>
				</div>
				<div className="flex gap-2">
					{data.status === 'Scheduled' && onStart && (
						<Button onClick={onStart}>Start Maintenance</Button>
					)}
					{data.status === 'InProgress' && onComplete && (
						<Button onClick={onComplete}>Complete</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Vehicle Info */}
				{data.vehicle && (
					<div className="flex items-start gap-3">
						<Car className="mt-0.5 h-5 w-5 text-muted-foreground" />
						<div>
							<p className="text-sm font-medium">Vehicle</p>
							<Link
								to={`/vehicles/${data.vehicle.id}`}
								className="text-sm text-primary hover:underline"
							>
								{data.vehicle.name} ({data.vehicle.plateNumber})
							</Link>
						</div>
					</div>
				)}

				{/* Date Range */}
				<div className="flex items-start gap-3">
					<Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
					<div>
						<p className="text-sm font-medium">Schedule</p>
						<p className="text-sm text-muted-foreground">
							{format(new Date(data.startDate), 'MMM d, yyyy')}
							{data.endDate && ` - ${format(new Date(data.endDate), 'MMM d, yyyy')}`}
						</p>
					</div>
				</div>

				{/* Description */}
				<div className="flex items-start gap-3">
					<FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
					<div>
						<p className="text-sm font-medium">Description</p>
						<p className="text-sm text-muted-foreground whitespace-pre-wrap">
							{data.description}
						</p>
					</div>
				</div>

				{/* Cost */}
				<div className="flex items-start gap-3">
					<DollarSign className="mt-0.5 h-5 w-5 text-muted-foreground" />
					<div>
						<p className="text-sm font-medium">Estimated Cost</p>
						<p className="text-sm text-muted-foreground">
							{formatCurrency(data.cost)}
						</p>
					</div>
				</div>

				{/* Related Booking */}
				{data.booking && (
					<div className="flex items-start gap-3">
						<FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
						<div>
							<p className="text-sm font-medium">Related Booking</p>
							<Link
								to={`/bookings/${data.booking.id}`}
								className="text-sm text-primary hover:underline"
							>
								{data.booking.bookingNumber} - {data.booking.customerName}
							</Link>
						</div>
					</div>
				)}

				{/* Created By */}
				{data.createdByUser && (
					<div className="flex items-start gap-3">
						<User className="mt-0.5 h-5 w-5 text-muted-foreground" />
						<div>
							<p className="text-sm font-medium">Created By</p>
							<p className="text-sm text-muted-foreground">{data.createdByUser.name}</p>
						</div>
					</div>
				)}

				{/* Photos */}
				{data.photos && data.photos.length > 0 && (
					<div className="space-y-2">
						<p className="text-sm font-medium">Photos</p>
						<div className="grid grid-cols-4 gap-2">
							{data.photos.map((photo, index) => (
								<a
									key={index}
									href={photo.url}
									target="_blank"
									rel="noopener noreferrer"
									className="block aspect-square overflow-hidden rounded-lg"
								>
									<img
										src={photo.url}
										alt={photo.caption || `Photo ${index + 1}`}
										className="h-full w-full object-cover hover:scale-105 transition-transform"
									/>
								</a>
							))}
						</div>
					</div>
				)}

				{/* Timestamps */}
				<div className="border-t pt-4 text-xs text-muted-foreground">
					<p>Created: {format(new Date(data.createdAt!), 'PPp')}</p>
					<p>Updated: {format(new Date(data.updatedAt!), 'PPp')}</p>
				</div>
			</CardContent>
		</Card>
	);
}
