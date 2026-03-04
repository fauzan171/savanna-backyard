import { Users, Car, FileText, DollarSign, TrendingUp } from 'lucide-react';
import { StatCard } from '@/react-app/components/ui/stat-card';
import type { DashboardOverview } from '../types/dashboard.types';

interface OverviewStatsProps {
	data: DashboardOverview | undefined;
	isLoading: boolean;
}

export function OverviewStats({ data, isLoading }: OverviewStatsProps) {
	const formatCurrency = (amount: number, currency: string) => {
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
			value: data?.leads?.new ?? 0,
			icon: <FileText className="h-4 w-4" />,
			description: `${data?.leads?.converted ?? 0} converted this period`,
		},
		{
			title: 'Active Bookings',
			value: data?.activeBookings ?? 0,
			icon: <Car className="h-4 w-4" />,
			description: `${data?.upcomingPickups ?? 0} pickups today`,
		},
		{
			title: 'Available Vehicles',
			value: data?.fleet?.available ?? 0,
			icon: <TrendingUp className="h-4 w-4" />,
			description: `${data?.fleet?.total ?? 0} total fleet`,
		},
		{
			title: 'Payments Pending',
			value: data?.payments?.pending ?? 0,
			icon: <Users className="h-4 w-4" />,
			description: `${data?.payments?.overdue ?? 0} overdue`,
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
					data?.revenue?.change
						? {
								value: Math.abs(data.revenue.change.value ?? 0),
								direction: data.revenue.change.direction === 'neutral' ? 'up' : data.revenue.change.direction,
								label: data.revenue.change.direction === 'up' ? 'increase' : 'decrease',
							}
						: undefined
				}
				loading={isLoading}
				className="md:col-span-2 lg:col-span-4"
			/>
		</div>
	);
}