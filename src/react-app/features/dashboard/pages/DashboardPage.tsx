import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, QrCode } from 'lucide-react';
import { OverviewStats } from '../components/OverviewStats';
import { RevenueChart } from '../components/RevenueChart';
import { ActivityFeed } from '../components/ActivityFeed';
import { PeriodFilter } from '../components/PeriodFilter';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { QrScannerModal } from '@/react-app/features/bookings/components/QrScannerModal';
import {
	useDashboardOverview,
	useDashboardRevenue,
	useDashboardActivities,
} from '../hooks/useDashboard';
import type { PeriodFilter as PeriodFilterType } from '../types/dashboard.types';

export default function DashboardPage() {
	const [period, setPeriod] = useState<PeriodFilterType>('month');
	const [isScanOpen, setIsScanOpen] = useState(false);

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

			{/* Quick actions */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Link
					to="/calendar"
					className="rounded-lg border p-4 transition hover:border-primary/40 hover:bg-muted/40"
				>
					<div className="flex items-center gap-3">
						<div className="rounded-md bg-primary/10 p-2 text-primary">
							<CalendarDays className="size-5" />
						</div>
						<div>
							<p className="font-medium">Fleet Schedule</p>
							<p className="text-xs text-muted-foreground">Kalender ketersediaan motor</p>
						</div>
					</div>
				</Link>
				<button
					type="button"
					onClick={() => setIsScanOpen(true)}
					className="rounded-lg border p-4 text-left transition hover:border-primary/40 hover:bg-muted/40"
				>
					<div className="flex items-center gap-3">
						<div className="rounded-md bg-primary/10 p-2 text-primary">
							<QrCode className="size-5" />
						</div>
						<div>
							<p className="font-medium">Scan QR Motor</p>
							<p className="text-xs text-muted-foreground">Cari & proses rental aktif</p>
						</div>
					</div>
				</button>
			</div>

			<OverviewStats data={overview} isLoading={overviewLoading} />

			<div className="grid gap-6 lg:grid-cols-2">
				<RevenueChart data={revenue} isLoading={revenueLoading} />
				<ActivityFeed data={activities} isLoading={activitiesLoading} />
			</div>

			<QrScannerModal open={isScanOpen} onOpenChange={setIsScanOpen} />
		</div>
	);
}
