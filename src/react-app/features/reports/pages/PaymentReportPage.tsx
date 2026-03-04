import { useState } from 'react';
import { Link } from 'react-router';
import {
	ArrowLeft,
	CheckCircle,
	Clock,
	AlertCircle,
	DollarSign,
	FileText,
	TrendingUp,
} from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { StatCard } from '@/react-app/components/ui/stat-card';
import { formatCurrency } from '@/react-app/lib/utils';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { ExportButton } from '../components/ExportButton';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { PieChart } from '../components/charts/PieChart';
import { usePaymentReport } from '../hooks/useReports';

export default function PaymentReportPage() {
	const [startDate, setStartDate] = useState<Date>();
	const [endDate, setEndDate] = useState<Date>();
	const [preset, setPreset] = useState('month');

	const params = {
		startDate: startDate?.toISOString().split('T')[0],
		endDate: endDate?.toISOString().split('T')[0],
	};

	const { data: report, isLoading } = usePaymentReport(params);

	// backend pakai dailyBreakdown, bukan trend
	const trendData = (report?.dailyBreakdown ?? report?.trend ?? []).map((item) => ({
		date: item.date,
		count: item.count,
		amount: item.amount,
	}));

	const methodData = (report?.byMethod ?? []).map((item) => ({
		method: item.method,
		count: item.count,
		amount: item.total ?? item.amount ?? 0,
	}));

	// backend kirim byStatus sebagai object {Verified: 0, Pending: 0, Failed: 0}
	const byStatusArray = Array.isArray(report?.byStatus)
		? report.byStatus
		: Object.entries(report?.byStatus ?? {}).map(([status, count]) => ({
				status,
				count: count as number,
				amount: 0,
				percentage: 0,
		  }));

	const statusPieData = byStatusArray.map((item) => ({
		name: item.status,
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
							Payment Report
						</h1>
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Payment status and method breakdown
						</p>
					</div>
				</div>
				<ExportButton
					reportType="payments"
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
					title="Total Expected"
					value={report ? formatCurrency(report.summary.totalExpected) : '-'}
					icon={<FileText className="h-4 w-4" />}
					loading={isLoading}
				/>
				<StatCard
					title="Total Received"
					value={report ? formatCurrency(report.summary.totalReceived) : '-'}
					icon={<DollarSign className="h-4 w-4" />}
					loading={isLoading}
				/>
				<StatCard
					title="Pending"
					value={report ? formatCurrency(report.summary.totalPending) : '-'}
					icon={<Clock className="h-4 w-4" />}
					loading={isLoading}
				/>
				<StatCard
					title="Collection Rate"
					value={report ? `${(report.summary.collectionRate ?? 0).toFixed(1)}%` : '-'}
					icon={<TrendingUp className="h-4 w-4" />}
					loading={isLoading}
				/>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<LineChart
					title="Payment Trend"
					data={trendData}
					xKey="date"
					lines={[
						{ dataKey: 'amount', name: 'Amount', color: 'hsl(var(--primary))' },
					]}
					loading={isLoading}
					empty={trendData.length === 0}
					formatY={formatCurrency}
				/>

				<BarChart
					title="Payments by Method"
					data={methodData}
					xKey="method"
					bars={[
						{ dataKey: 'amount', name: 'Amount' },
					]}
					loading={isLoading}
					empty={methodData.length === 0}
					formatY={formatCurrency}
				/>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<PieChart
					title="Payments by Status"
					data={statusPieData}
					loading={isLoading}
					empty={statusPieData.length === 0}
				/>

				<BarChart
					title="Payment Count by Method"
					data={methodData}
					xKey="method"
					bars={[
						{ dataKey: 'count', name: 'Count', color: 'hsl(217.2 91.2% 59.8%)' },
					]}
					loading={isLoading}
					empty={methodData.length === 0}
				/>
			</div>

			{/* Status Summary Table */}
			<div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
				<div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Payment Status Summary
					</h3>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<thead className="bg-gray-50 dark:bg-gray-900">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
									Status
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
									Count
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
							{isLoading ? (
								<tr>
									<td colSpan={2} className="px-6 py-4 text-center text-gray-500">
										Loading...
									</td>
								</tr>
							) : byStatusArray.length === 0 ? (
								<tr>
									<td colSpan={2} className="px-6 py-4 text-center text-gray-500">
										No payment data available
									</td>
								</tr>
							) : (
								byStatusArray.map((item) => (
									<tr key={item.status}>
										<td className="whitespace-nowrap px-6 py-4">
											<div className="flex items-center gap-2">
												{item.status === 'Verified' && (
													<CheckCircle className="h-4 w-4 text-green-500" />
												)}
												{item.status === 'Pending' && (
													<Clock className="h-4 w-4 text-yellow-500" />
												)}
												{item.status === 'Failed' && (
													<AlertCircle className="h-4 w-4 text-red-500" />
												)}
												<span className="text-sm font-medium text-gray-900 dark:text-white">
													{item.status}
												</span>
											</div>
										</td>
										<td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
											{item.count}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}