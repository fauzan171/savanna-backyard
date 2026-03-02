import type { Meta, StoryObj } from '@storybook/react';
import { StatCard } from './stat-card';
import { Users, DollarSign, Car, TrendingUp } from 'lucide-react';

const meta = {
	title: 'UI/StatCard',
	component: StatCard,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		size: {
			control: 'select',
			options: ['sm', 'md', 'lg'],
		},
		trend: {
			control: 'object',
		},
	},
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		title: 'Total Customers',
		value: '1,234',
		description: 'Active customers',
	},
};

export const WithIcon: Story = {
	args: {
		title: 'Total Customers',
		value: '1,234',
		icon: <Users className="h-4 w-4" />,
		description: 'Active customers',
	},
};

export const WithTrendUp: Story = {
	args: {
		title: 'Revenue',
		value: '$45,231',
		icon: <DollarSign className="h-4 w-4" />,
		trend: {
			value: 12.5,
			direction: 'up',
			label: 'from last month',
		},
	},
};

export const WithTrendDown: Story = {
	args: {
		title: 'Active Vehicles',
		value: '57',
		icon: <Car className="h-4 w-4" />,
		trend: {
			value: -3.2,
			direction: 'down',
			label: 'from last week',
		},
	},
};

export const WithTrendNeutral: Story = {
	args: {
		title: 'Pending Bookings',
		value: '12',
		trend: {
			value: 0,
			direction: 'neutral',
			label: 'no change',
		},
	},
};

export const Loading: Story = {
	args: {
		title: 'Loading Stat',
		loading: true,
	},
};

export const Small: Story = {
	args: {
		title: 'Small Card',
		value: '42',
		size: 'sm',
	},
};

export const Large: Story = {
	args: {
		title: 'Large Card',
		value: '$1,234,567',
		description: 'Total revenue this year',
		size: 'lg',
	},
};

export const Grid: Story = {
	render: () => (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<StatCard
				title="Total Customers"
				value="1,234"
				icon={<Users className="h-4 w-4" />}
				trend={{ value: 12.5, direction: 'up' }}
			/>
			<StatCard
				title="Revenue"
				value="$45,231"
				icon={<DollarSign className="h-4 w-4" />}
				trend={{ value: 8.2, direction: 'up' }}
			/>
			<StatCard
				title="Active Vehicles"
				value="57"
				icon={<Car className="h-4 w-4" />}
				trend={{ value: -2.1, direction: 'down' }}
			/>
			<StatCard
				title="Bookings"
				value="89"
				icon={<TrendingUp className="h-4 w-4" />}
				trend={{ value: 0, direction: 'neutral' }}
			/>
		</div>
	),
	parameters: {
		layout: 'padded',
	},
};
