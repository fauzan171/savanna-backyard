import { formatDistanceToNow } from 'date-fns';
import {
	CalendarCheck,
	XCircle,
	DollarSign,
	UserCheck,
	Wrench,
	CheckCircle,
	Car,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/react-app/components/ui/card';
import { Badge } from '@/react-app/components/ui/badge';
import { Skeleton } from '@/react-app/components/ui/skeleton';
import { Link } from 'react-router';
import type { Activity, ActivitiesResult } from '../types/dashboard.types';

interface ActivityFeedProps {
	data: ActivitiesResult | undefined;
	isLoading: boolean;
}

const activityIcons: Record<Activity['type'], React.ReactNode> = {
	booking_created: <CalendarCheck className="h-4 w-4" />,
	booking_started: <Car className="h-4 w-4" />,
	booking_completed: <CheckCircle className="h-4 w-4" />,
	booking_cancelled: <XCircle className="h-4 w-4" />,
	payment_received: <DollarSign className="h-4 w-4" />,
	lead_converted: <UserCheck className="h-4 w-4" />,
	maintenance_started: <Wrench className="h-4 w-4" />,
	maintenance_completed: <CheckCircle className="h-4 w-4" />,
};

const activityBadgeVariants: Record<Activity['type'], 'default' | 'success' | 'error' | 'warning' | 'info' | 'outline' | 'primary'> = {
	booking_created: 'info',
	booking_started: 'info',
	booking_completed: 'success',
	booking_cancelled: 'error',
	payment_received: 'success',
	lead_converted: 'success',
	maintenance_started: 'warning',
	maintenance_completed: 'success',
};

const entityRoutes: Record<Activity['entityType'], string> = {
	booking: '/bookings',
	payment: '/payments',
	lead: '/leads',
	maintenance: '/maintenance',
	vehicle: '/vehicles',
	customer: '/customers',
};

function ActivityItem({ activity }: { activity: Activity }) {
	const icon = activityIcons[activity.type];
	const badgeVariant = activityBadgeVariants[activity.type];

	return (
		<div className="flex items-start gap-3 py-3">
			<div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
				{icon}
			</div>
			<div className="flex-1 space-y-1">
				<div className="flex items-center gap-2">
					<p className="text-sm font-medium">{activity.title}</p>
					<Badge variant={badgeVariant} className="text-xs">
						{activity.type.replace(/_/g, ' ')}
					</Badge>
				</div>
				<p className="text-xs text-muted-foreground">{activity.description}</p>
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<Link
						to={`${entityRoutes[activity.entityType]}/${activity.entityId}`}
						className="hover:underline"
					>
						{activity.entityReference}
					</Link>
					<span>•</span>
					<span>{activity.performedBy.name}</span>
					<span>•</span>
					<span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
				</div>
			</div>
		</div>
	);
}

export function ActivityFeed({ data, isLoading }: ActivityFeedProps) {
	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{[...Array(5)].map((_, i) => (
							<div key={i} className="flex items-start gap-3 py-3">
								<Skeleton className="h-8 w-8 rounded-full" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-3 w-1/2" />
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!data?.activities || data.activities.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
						No recent activity
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="divide-y divide-border">
					{data.activities.map((activity) => (
						<ActivityItem key={activity.id} activity={activity} />
					))}
				</div>
			</CardContent>
		</Card>
	);
}
