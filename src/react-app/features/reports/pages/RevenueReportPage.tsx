import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { StatCard } from '@/react-app/components/ui/stat-card';
import { formatCurrency } from '@/react-app/lib/utils';
import { toast } from '@/react-app/hooks/useToast';
import { extractApiError } from '@/react-app/lib/extract-error';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { ExportButton } from '../components/ExportButton';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { PieChart } from '../components/charts/PieChart';
import { useRevenueReport } from '../hooks/useReports';

export default function RevenueReportPage() {
	const [startDate, setStartDate] = useState<Date>();
	const [endDate, setEndDate] = useState<Date>();
	const [preset, setPreset] = useState('month');

	const params = {
		startDate: startDate?.toISOString().split('T')[0],
		endDate: endDate?.toISOString().split('T')[0],
	};

	// TC-RPT-002: start > end is always a server 400. Detect locally, skip the
	// wasted request, and tell the user.
	const rangeInvalid = !!(startDate && endDate && startDate > endDate);

	const { data: report, isLoading, error } = useRevenueReport(params, { enabled: !rangeInvalid });

	useEffect(() => {
		if (rangeInvalid) {
			toast({
				variant: 'destructive',
				title: 'Rentang tanggal tidak valid',
				description: 'Tanggal mulai harus sebelum atau sama dengan tanggal selesai.',
			});
		}
	}, [rangeInvalid]);

	useEffect(() => {
		if (error) {
			toast({
				variant: 'destructive',
				title: 'Gagal memuat laporan revenue',
				description: extractApiError(error, 'Terjadi kesalahan saat memuat laporan'),
			});
		}
	}, [error]);

	const chartData = (report?.byPeriod ?? []).map((item) => ({
		period: item.period,
		revenue: item.revenue,
		bookings: item.bookings,
	}));

	const paymentMethodData = (report?.byPaymentMethod ?? []).map((item) => ({
		name: item.method,
		value: item.amount,
	}));

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button variant="ghost" asChild>
						<Link to="/reports">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Reports
						</Link>
					</Button>
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
							Revenue Report
						</h1>
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Track revenue trends and payment breakdown
						</p>
					</div>
				</div>
				<ExportButton
					reportType="revenue"
					params={params}
					disabled={isLoading}
				/>
			</div>

			<DateRangeFilter
				startDate={startDate}
				endDate={endDate}
				onStartDateChange={setStartDate}
				onEndDateChange={setEndDate}
				preset={preset}
				onPresetChange={setPreset}
			/>

			<div className="grid gap-4 md:grid-cols-3">
				<StatCard
					title="Total Revenue"
					value={report ? formatCurrency(report.summary.totalRevenue) : '-'}
					icon={<DollarSign className="h-4 w-4" />}
					loading={isLoading}
				/>
				<StatCard
					title="Total Bookings"
					value={report?.summary.totalBookings ?? 0}
					icon={<FileText className="h-4 w-4" />}
					loading={isLoading}
				/>
				<StatCard
					title="Average per Booking"
					value={report ? formatCurrency(report.summary.averagePerBooking) : '-'}
					icon={<TrendingUp className="h-4 w-4" />}
					loading={isLoading}
				/>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<LineChart
					title="Revenue Trend"
					data={chartData ?? []}
					xKey="period"
					lines={[
						{ dataKey: 'revenue', name: 'Revenue', color: 'hsl(var(--primary))' },
					]}
					loading={isLoading}
					empty={!chartData || chartData.length === 0}
					formatY={formatCurrency}
				/>

				<BarChart
					title="Revenue by Vehicle Type"
					data={report?.byVehicleType ?? []}
					xKey="type"
					bars={[
						{ dataKey: 'revenue', name: 'Revenue' },
					]}
					loading={isLoading}
					empty={!report?.byVehicleType || report.byVehicleType.length === 0}
					formatY={formatCurrency}
				/>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<PieChart
					title="Revenue by Payment Method"
					data={paymentMethodData ?? []}
					loading={isLoading}
					empty={!paymentMethodData || paymentMethodData.length === 0}
					formatValue={formatCurrency}
				/>

				<BarChart
					title="Bookings by Vehicle Type"
					data={report?.byVehicleType ?? []}
					xKey="type"
					bars={[
						{ dataKey: 'bookings', name: 'Bookings', color: 'hsl(217.2 91.2% 59.8%)' },
					]}
					loading={isLoading}
					empty={!report?.byVehicleType || report.byVehicleType.length === 0}
				/>
			</div>
		</div>
	);
}
