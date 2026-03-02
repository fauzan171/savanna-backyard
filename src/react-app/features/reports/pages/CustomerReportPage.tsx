import { useState } from 'react';
import { Link } from 'react-router';
import {
	ArrowLeft,
	Users,
	UserPlus,
	UserCheck,
	TrendingUp,
	DollarSign,
	ExternalLink,
} from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { StatCard } from '@/react-app/components/ui/stat-card';
import { formatCurrency } from '@/react-app/lib/utils';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { ExportButton } from '../components/ExportButton';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { PieChart } from '../components/charts/PieChart';
import { useCustomerReport } from '../hooks/useReports';

export default function CustomerReportPage() {
	const [startDate, setStartDate] = useState<Date>();
	const [endDate, setEndDate] = useState<Date>();
	const [preset, setPreset] = useState('month');

	const params = {
		startDate: startDate?.toISOString().split('T')[0],
		endDate: endDate?.toISOString().split('T')[0],
	};

	const { data: report, isLoading } = useCustomerReport(params);

	const trendData = report?.trend.map((item) => ({
		date: item.date,
		new: item.new,
		repeat: item.repeat,
	}));

	const bookingCountData = report?.byBookingCount.map((item) => ({
		bookingCount: item.bookingCount,
		customerCount: item.customerCount,
		percentage: item.percentage,
	}));

	const bookingCountPieData = report?.byBookingCount.map((item) => ({
		name: `${item.bookingCount} bookings`,
		value: item.customerCount,
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
							Customer Report
						</h1>
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Customer retention and top customers analysis
						</p>
					</div>
				</div>
				<ExportButton
					reportType="customers"
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
					title="Total Customers"
					value={report?.summary.totalCustomers ?? 0}
					icon={<Users className="h-4 w-4" />}
					loading={isLoading}
				/>
				<StatCard
					title="New Customers"
					value={report?.summary.newCustomers ?? 0}
					icon={<UserPlus className="h-4 w-4" />}
					loading={isLoading}
				/>
				<StatCard
					title="Repeat Customers"
					value={report?.summary.repeatCustomers ?? 0}
					icon={<UserCheck className="h-4 w-4" />}
					loading={isLoading}
				/>
				<StatCard
					title="Repeat Rate"
					value={report ? `${report.summary.repeatRate.toFixed(1)}%` : '-'}
					icon={<TrendingUp className="h-4 w-4" />}
					loading={isLoading}
				/>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<LineChart
					title="Customer Trend"
					data={trendData ?? []}
					xKey="date"
					lines={[
						{ dataKey: 'new', name: 'New', color: 'hsl(var(--primary))' },
						{ dataKey: 'repeat', name: 'Repeat', color: 'hsl(142.1 76.2% 36.3%)' },
					]}
					loading={isLoading}
					empty={!trendData || trendData.length === 0}
				/>

				<BarChart
					title="Customers by Booking Count"
					data={bookingCountData ?? []}
					xKey="bookingCount"
					bars={[
						{ dataKey: 'customerCount', name: 'Customers' },
					]}
					loading={isLoading}
					empty={!bookingCountData || bookingCountData.length === 0}
				/>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<PieChart
					title="Customer Distribution by Booking Count"
					data={bookingCountPieData ?? []}
					loading={isLoading}
					empty={!bookingCountPieData || bookingCountPieData.length === 0}
				/>

				<div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
					<h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
						Booking Count Breakdown
					</h3>
					<div className="space-y-4">
						{isLoading ? (
							<div className="text-center text-gray-500">Loading...</div>
						) : !report?.byBookingCount || report.byBookingCount.length === 0 ? (
							<div className="text-center text-gray-500">No data available</div>
						) : (
							report.byBookingCount.map((item) => (
								<div
									key={item.bookingCount}
									className="flex items-center justify-between"
								>
									<div className="flex items-center gap-2">
										<div className="h-3 w-3 rounded-full bg-primary" />
										<span className="text-sm text-gray-700 dark:text-gray-300">
											{item.bookingCount} booking{item.bookingCount !== '1' ? 's' : ''}
										</span>
									</div>
									<div className="flex items-center gap-4">
										<span className="text-sm font-medium text-gray-900 dark:text-white">
											{item.customerCount} customers
										</span>
										<span className="text-sm text-gray-500">
											({(item.percentage ?? 0).toFixed(1)}%)
										</span>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>

			{/* Top Customers Table */}
			<div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
				<div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Top Customers
					</h3>
					<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
						Customers with highest total spending
					</p>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<thead className="bg-gray-50 dark:bg-gray-900">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
									Customer
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
									Contact
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
									Bookings
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
									Total Spent
								</th>
								<th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
									Action
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
							{isLoading ? (
								<tr>
									<td colSpan={5} className="px-6 py-4 text-center text-gray-500">
										Loading...
									</td>
								</tr>
							) : !report?.topCustomers || report.topCustomers.length === 0 ? (
								<tr>
									<td colSpan={5} className="px-6 py-4 text-center text-gray-500">
										No customer data available
									</td>
								</tr>
							) : (
								report.topCustomers.map((customer) => (
									<tr key={customer.id}>
										<td className="whitespace-nowrap px-6 py-4">
											<div className="flex items-center">
												<div>
													<div className="text-sm font-medium text-gray-900 dark:text-white">
														{customer.name}
													</div>
												</div>
											</div>
										</td>
										<td className="whitespace-nowrap px-6 py-4">
											<div className="text-sm text-gray-900 dark:text-white">
												{customer.email}
											</div>
											<div className="text-sm text-gray-500">{customer.phone}</div>
										</td>
										<td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
											{customer.bookingCount}
										</td>
										<td className="whitespace-nowrap px-6 py-4 text-right">
											<div className="flex items-center justify-end gap-1 text-sm font-medium text-gray-900 dark:text-white">
												<DollarSign className="h-3 w-3" />
												{formatCurrency(customer.totalSpent)}
											</div>
										</td>
										<td className="whitespace-nowrap px-6 py-4 text-center">
											<Button variant="ghost" size="sm" asChild>
												<Link to={`/customers/${customer.id}`}>
													<ExternalLink className="h-4 w-4" />
												</Link>
											</Button>
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
