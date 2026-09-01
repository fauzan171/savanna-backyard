import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, QrCode, ClipboardCheck, KeyRound } from 'lucide-react';
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
import { useAuthStore } from '@/react-app/features/auth/stores/authStore';

export default function DashboardPage() {
	const [period, setPeriod] = useState<PeriodFilterType>('month');
	const [isScanOpen, setIsScanOpen] = useState(false);
	const { user } = useAuthStore();
	const isSuperAdmin = user?.role === 'SUPER_ADMIN';

	const { data: overview, isLoading: overviewLoading } = useDashboardOverview({ period });
	const { data: revenue, isLoading: revenueLoading } = useDashboardRevenue({ period });
	const { data: activities, isLoading: activitiesLoading } = useDashboardActivities(10);

	return (
		<div className="space-y-5 pb-24 md:pb-0">
			<PageHeader
				title="Beranda"
				description="Ringkasan operasional rental kendaraan hari ini"
				actions={<PeriodFilter value={period} onChange={setPeriod} />}
			/>

			{/* Quick actions */}
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<button
					type="button"
					onClick={() => setIsScanOpen(true)}
					className="rounded-lg border border-primary/40 bg-primary/10 p-4 text-left shadow-sm transition hover:border-primary hover:bg-primary/15"
				>
					<div className="flex items-center gap-3">
						<div className="rounded-md bg-primary p-2 text-primary-foreground">
							<QrCode className="size-5" />
						</div>
						<div>
							<p className="font-semibold">Scan / Cek Motor</p>
							<p className="text-xs text-muted-foreground">Buka kamera, cek KM dan kondisi</p>
						</div>
					</div>
				</button>
				<Link
					to="/calendar"
					className="rounded-lg border p-4 transition hover:border-primary/40 hover:bg-muted/40"
				>
					<div className="flex items-center gap-3">
						<div className="rounded-md bg-primary/10 p-2 text-primary">
							<CalendarDays className="size-5" />
						</div>
						<div>
							<p className="font-medium">Jadwal Kendaraan</p>
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
							<ClipboardCheck className="size-5" />
						</div>
						<div>
							<p className="font-medium">Checklist Lapangan</p>
							<p className="text-xs text-muted-foreground">Cek kondisi motor setelah scan</p>
						</div>
					</div>
				</button>
				{isSuperAdmin && (
					<Link
						to="/otp"
						className="rounded-lg border p-4 transition hover:border-primary/40 hover:bg-muted/40"
					>
						<div className="flex items-center gap-3">
							<div className="rounded-md bg-primary/10 p-2 text-primary">
								<KeyRound className="size-5" />
							</div>
							<div>
								<p className="font-medium">OTP Customer</p>
								<p className="text-xs text-muted-foreground">Lihat kode login customer</p>
							</div>
						</div>
					</Link>
				)}
			</div>

			<OverviewStats data={overview} isLoading={overviewLoading} />

			<div className="grid gap-6 lg:grid-cols-2">
				<RevenueChart data={revenue} isLoading={revenueLoading} />
				<ActivityFeed data={activities} isLoading={activitiesLoading} />
			</div>

			<QrScannerModal open={isScanOpen} onOpenChange={setIsScanOpen} />
			<button
				type="button"
				onClick={() => setIsScanOpen(true)}
				className="fixed inset-x-4 bottom-4 z-30 flex h-14 items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground shadow-xl md:hidden"
			>
				<QrCode className="mr-2 size-5" />
				Scan / Cek Motor
			</button>
		</div>
	);
}
