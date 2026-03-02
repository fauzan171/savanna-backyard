import { useState } from 'react';
import { OverviewStats } from '../components/OverviewStats';
import { RevenueChart } from '../components/RevenueChart';
import { ActivityFeed } from '../components/ActivityFeed';
import { PeriodFilter } from '../components/PeriodFilter';
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
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
					<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
						Overview of your vehicle rental business
					</p>
				</div>
				<PeriodFilter value={period} onChange={setPeriod} />
			</div>

			<OverviewStats data={overview} isLoading={overviewLoading} />

			<div className="grid gap-6 lg:grid-cols-2">
				<RevenueChart data={revenue} isLoading={revenueLoading} />
				<ActivityFeed data={activities} isLoading={activitiesLoading} />
			</div>
		</div>
	);
}
