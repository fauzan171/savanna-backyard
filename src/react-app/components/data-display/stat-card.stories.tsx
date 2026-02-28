import type { Meta, StoryObj } from '@storybook/react';
import { StatCard } from './stat-card';
import { DollarSign, Users, TrendingUp, Bike, Calendar, Clock } from 'lucide-react';

const meta = {
	title: 'Data Display/StatCard',
	component: StatCard,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof StatCard>;

export default meta;

export const Default: Story = {
	args: {
		value: 45,
		label: 'Total Bookings',
	},
};

export const WithPrefix: Story = {
	args: {
		value: 4500000,
		label: "Today's Revenue",
		prefix: 'Rp ',
	},
};

export const WithSuffix: Story = {
	args: {
		value: 85,
		label: 'Fleet Utilization',
		suffix: '%',
	},
};

export const WithTrendUp: Story = {
	args: {
		value: 4500000,
		label: 'Revenue',
		prefix: 'Rp ',
		trend: {
			value: 12.5,
			direction: 'up',
			label: 'vs last month',
		},
	},
};

export const WithTrendDown: Story = {
	args: {
		value: 28,
		label: 'Active Bookings',
		trend: {
			value: 8.2,
			direction: 'down',
			label: 'vs last week',
		},
	},
};

export const WithTrendNeutral: Story = {
	args: {
		value: 156,
		label: 'Total Customers',
		trend: {
			value: 0,
			direction: 'neutral',
			label: 'no change',
		},
	},
};

export const WithIcon: Story = {
	args: {
		value: 12,
		label: 'Vehicles Available',
		icon: <Bike className="size-6" />,
	},
};

export const Complete: Story = {
	args: {
		value: 4500000,
		label: "Today's Revenue",
		prefix: 'Rp ',
		icon: <DollarSign className="size-6" />,
		trend: {
			value: 12.5,
			direction: 'up',
			label: 'vs yesterday',
		},
	},
};

export const Compact: Story = {
	args: {
		value: 85,
		label: 'Fleet Utilization',
		suffix: '%',
		variant: 'compact',
		icon: <TrendingUp className="size-5" />,
	},
};

export const CompactWithTrend: Story = {
	args: {
		value: 156,
		label: 'Total Customers',
		variant: 'compact',
		icon: <Users className="size-5" />,
		trend: {
			value: 5.2,
			direction: 'up',
		},
	},
};

export const DashboardGrid: Story = {
	render: () => (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-[800px]">
			<StatCard
				value={4500000}
				label="Today's Revenue"
				prefix="Rp "
				icon={<DollarSign className="size-6" />}
				trend={{ value: 12.5, direction: 'up', label: 'vs yesterday' }}
			/>
			<StatCard
				value={28}
				label="Active Bookings"
				icon={<Calendar className="size-6" />}
				trend={{ value: 8, direction: 'up', label: 'vs last week' }}
			/>
			<StatCard
				value={12}
				label="New Leads"
				icon={<Users className="size-6" />}
				trend={{ value: 3, direction: 'down', label: 'vs yesterday' }}
			/>
			<StatCard
				value={85}
				label="Fleet Utilization"
				suffix="%"
				icon={<Bike className="size-6" />}
				trend={{ value: 0, direction: 'neutral', label: 'no change' }}
			/>
		</div>
	),
};

export const CompactGrid: Story = {
	render: () => (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-[800px]">
			<StatCard
				value={4500000}
				label="Revenue"
				prefix="Rp "
				variant="compact"
				icon={<DollarSign className="size-5" />}
			/>
			<StatCard
				value={28}
				label="Active"
				variant="compact"
				icon={<Calendar className="size-5" />}
			/>
			<StatCard
				value={12}
				label="Leads"
				variant="compact"
				icon={<Users className="size-5" />}
			/>
			<StatCard
				value={85}
				label="Utilization"
				suffix="%"
				variant="compact"
				icon={<Bike className="size-5" />}
			/>
		</div>
	),
};

export const Clickable: Story = {
	render: () => (
		<StatCard
			value={28}
			label="Active Bookings"
			icon={<Calendar className="size-6" />}
			onClick={() => alert('Clicked!')}
			className="w-64"
		/>
	),
};
