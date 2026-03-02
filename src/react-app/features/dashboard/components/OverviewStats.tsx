import { Users, Car, FileText, DollarSign, TrendingUp } from 'lucide-react';
import { StatCard } from '@/react-app/components/ui/stat-card';
import type { DashboardOverview } from '../types/dashboard.types';

interface OverviewStatsProps {
	data: DashboardOverview | undefined;
	isLoading: boolean;
}

export function OverviewStats({ data, isLoading }: OverviewStatsProps) {
	const formatCurrency = (amount: number, currency: 'IDR' | 'USD') => {
		if (currency === 'IDR') {
			return new Intl.NumberFormat('id-ID', {
				style: 'currency',
				currency: 'IDR',
				minimumFractionDigits: 0,
				maximumFractionDigits: 0,
			}).format(amount);
		}
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(amount);
	};

	const stats = [
		{
			title: 'Total Leads',
			value: data?.leads.total ?? 0,
			icon: <FileText className="h-4 w-4" />,
			description: `${data?.leads.new ?? 0} new this period`,
		},
		{
			title: 'Active Bookings',
			value: data?.bookings.active ?? 0,
			icon: <Car className="h-4 w-4" />,
			description: `${data?.bookings.total ?? 0} total`,
		},
		{
			title: 'Available Vehicles',
			value: data?.vehicles.available ?? 0,
			icon: <TrendingUp className="h-4 w-4" />,
			description: `${data?.vehicles.total ?? 0} total fleet`,
		},
		{
			title: 'Total Customers',
			value: data?.customers.total ?? 0,
			icon: <Users className="h-4 w-4" />,
			description: `${data?.customers.new ?? 0} new this period`,
		},
	];

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{stats.map((stat) => (
				<StatCard
					key={stat.title}
					title={stat.title}
					value={stat.value}
					icon={stat.icon}
					description={stat.description}
					loading={isLoading}
				/>
			))}
			<StatCard
				title="Revenue"
				value={data ? formatCurrency(data.revenue.total, data.revenue.currency) : '-'}
				icon={<DollarSign className="h-4 w-4" />}
				trend={
					data
						? {
								value: data.revenue.collected / (data.revenue.total || 1) * 100,
								direction: 'up' as const,
								label: 'collected',
							}
						: undefined
				}
				loading={isLoading}
				className="md:col-span-2 lg:col-span-4"
			/>
		</div>
	);
}
