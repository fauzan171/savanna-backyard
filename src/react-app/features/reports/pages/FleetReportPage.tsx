import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Car, FileText, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { StatCard } from '@/react-app/components/ui/stat-card';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { ExportButton } from '../components/ExportButton';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { useFleetUtilizationReport } from '../hooks/useReports';

export default function FleetReportPage() {
	const [startDate, setStartDate] = useState<Date>();
	const [endDate, setEndDate] = useState<Date>();
	const [preset, setPreset] = useState('month');

	const params = {
		startDate: startDate?.toISOString().split('T')[0],
		endDate: endDate?.toISOString().split('T')[0],
	};

	const { data: report, isLoading } = useFleetUtilizationReport(params);

	const trendData = report?.trend.map((item) => ({
		date: item.date,
		utilization: item.utilizationRate,
		bookings: item.bookings,
	}));

	const vehicleData = report?.byVehicle.slice(0, 10).map((item) => ({
		name: item.name,
		utilization: item.utilizationRate,
		bookings: item.bookingCount,
		revenue: item.revenue,
	}));

	const typeData = report?.byType.map((item) => ({
		type: item.type,
		utilization: item.averageUtilization,
		bookings: item.bookingCount,
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
							Fleet Utilization Report
						</h1>
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Analyze vehicle usage and availability
						</p>
					</div>
				</div>
				<ExportButton
					reportType="fleet-utilization"
					params={params}
					disabled={isLoading || !report}
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

			<div className="grid gap-4 md:grid-cols-4">
				<StatCard
					title="Total Vehicles"
					value={report?.summary.totalVehicles ?? 0}
					icon={<Car className="h-4 w-4" />}
					loading={isLoading}
				/>
				<StatCard
					title="Total Bookings"
					value={report?.summary.totalBookings ?? 0}
					icon={<FileText className="h-4 w-4" />}
					loading={isLoading}
				/>
				<StatCard
					title="Avg Utilization"
					value={report ? `${report.summary.averageUtilization.toFixed(1)}%` : '-'}
					icon={<TrendingUp className="h-4 w-4" />}
					loading={isLoading}
				/>
				<StatCard
					title="Days Booked"
					value={report?.summary.totalDaysBooked ?? 0}
					icon={<Calendar className="h-4 w-4" />}
					loading={isLoading}
				/>
			</div>

			<LineChart
				title="Utilization Trend"
				data={trendData ?? []}
				xKey="date"
				lines={[
					{ dataKey: 'utilization', name: 'Utilization %', color: 'hsl(var(--primary))' },
				]}
				loading={isLoading}
				empty={!trendData || trendData.length === 0}
				formatY={(v) => `${v.toFixed(1)}%`}
			/>

			<BarChart
				title="Top 10 Vehicles by Utilization"
				data={vehicleData ?? []}
				xKey="name"
				bars={[
					{ dataKey: 'utilization', name: 'Utilization %' },
				]}
				loading={isLoading}
				empty={!vehicleData || vehicleData.length === 0}
				formatY={(v) => `${v.toFixed(1)}%`}
			/>

			<BarChart
				title="Utilization by Vehicle Type"
				data={typeData ?? []}
				xKey="type"
				bars={[
					{ dataKey: 'utilization', name: 'Avg Utilization %' },
				]}
				loading={isLoading}
				empty={!typeData || typeData.length === 0}
				formatY={(v) => `${v.toFixed(1)}%`}
			/>
		</div>
	);
}
