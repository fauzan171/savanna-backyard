import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Users, UserCheck, TrendingUp } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { StatCard } from '@/react-app/components/ui/stat-card';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { ExportButton } from '../components/ExportButton';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { PieChart } from '../components/charts/PieChart';
import { useLeadSourceReport } from '../hooks/useReports';

export default function LeadSourceReportPage() {
	const [startDate, setStartDate] = useState<Date>();
	const [endDate, setEndDate] = useState<Date>();
	const [preset, setPreset] = useState('month');

	const params = {
		startDate: startDate?.toISOString().split('T')[0],
		endDate: endDate?.toISOString().split('T')[0],
	};

	const { data: report, isLoading } = useLeadSourceReport(params);

	const trendData = report?.trend.map((item) => ({
		date: item.date,
		new: item.new,
		converted: item.converted,
	}));

	const sourceData = report?.bySource.map((item) => ({
		source: item.source,
		count: item.count,
		converted: item.converted,
		conversionRate: item.conversionRate,
	}));

	const statusData = report?.byStatus.map((item) => ({
		name: item.status,
		value: item.count,
	}));

	const sourcePieData = report?.bySource.map((item) => ({
		name: item.source,
		value: item.count,
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
							Lead Source Report
						</h1>
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Track lead conversion by source
						</p>
					</div>
				</div>
				<ExportButton
					reportType="lead-sources"
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

			<div className="grid gap-4 md:grid-cols-3">
				<StatCard
					title="Total Leads"
					value={report?.summary.totalLeads ?? 0}
					icon={<Users className="h-4 w-4" />}
					loading={isLoading}
				/>
				<StatCard
					title="Converted"
					value={report?.summary.converted ?? 0}
					icon={<UserCheck className="h-4 w-4" />}
					loading={isLoading}
				/>
				<StatCard
					title="Conversion Rate"
					value={report ? `${report.summary.conversionRate.toFixed(1)}%` : '-'}
					icon={<TrendingUp className="h-4 w-4" />}
					loading={isLoading}
				/>
			</div>

			<LineChart
				title="Lead Trend"
				data={trendData ?? []}
				xKey="date"
				lines={[
					{ dataKey: 'new', name: 'New Leads', color: 'hsl(var(--primary))' },
					{ dataKey: 'converted', name: 'Converted', color: 'hsl(142.1 76.2% 36.3%)' },
				]}
				loading={isLoading}
				empty={!trendData || trendData.length === 0}
			/>

			<div className="grid gap-6 lg:grid-cols-2">
				<BarChart
					title="Leads by Source"
					data={sourceData ?? []}
					xKey="source"
					bars={[
						{ dataKey: 'count', name: 'Total Leads' },
						{ dataKey: 'converted', name: 'Converted', color: 'hsl(142.1 76.2% 36.3%)' },
					]}
					loading={isLoading}
					empty={!sourceData || sourceData.length === 0}
				/>

				<PieChart
					title="Leads by Source Distribution"
					data={sourcePieData ?? []}
					loading={isLoading}
					empty={!sourcePieData || sourcePieData.length === 0}
				/>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<BarChart
					title="Conversion Rate by Source"
					data={sourceData ?? []}
					xKey="source"
					bars={[
						{ dataKey: 'conversionRate', name: 'Conversion Rate %', color: 'hsl(262.1 83.3% 57.8%)' },
					]}
					loading={isLoading}
					empty={!sourceData || sourceData.length === 0}
					formatY={(v) => `${v.toFixed(1)}%`}
				/>

				<PieChart
					title="Leads by Status"
					data={statusData ?? []}
					loading={isLoading}
					empty={!statusData || statusData.length === 0}
				/>
			</div>
		</div>
	);
}
