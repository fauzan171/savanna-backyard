import { useState } from 'react';
import { OverviewStats } from '../components/OverviewStats';
import { RevenueChart } from '../components/RevenueChart';
import { ActivityFeed } from '../components/ActivityFeed';
import { PeriodFilter } from '../components/PeriodFilter';
import { PageHeader } from '@/react-app/components/layout/page-header';
import {
	useDashboardOverview,
	useDashboardRevenue,
	useDashboardActivities,
} from '../hooks/useDashboard';
import type { PeriodFilter as PeriodFilterType } from '../types/dashboard.types';

export default function DashboardPage() {
	const [period, setPeriod] = useState<PeriodFilterType>('month');

	const { data: overview, isLoading: overviewLoading } = useDashboardOverview({ period });
	const { data: revenue, isLoading: revenueLoading } = useDashboardRevenue({ period });
	const { data: activities, isLoading: activitiesLoading } = useDashboardActivities(10);

	return (
		<div className="space-y-6">
			<PageHeader
				title="Dashboard"
				description="Overview of your vehicle rental business"
				actions={<PeriodFilter value={period} onChange={setPeriod} />}
			/>

			<OverviewStats data={overview} isLoading={overviewLoading} />

			<div className="grid gap-6 lg:grid-cols-2">
				<RevenueChart data={revenue} isLoading={revenueLoading} />
				<ActivityFeed data={activities} isLoading={activitiesLoading} />
			</div>
		</div>
	);
}
