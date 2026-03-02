import type { Meta, StoryObj } from '@storybook/react';
import { ChartContainer } from './chart-container';
import { Button } from './button';

const meta = {
	title: 'UI/ChartContainer',
	component: ChartContainer,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		loading: {
			control: 'boolean',
		},
		empty: {
			control: 'boolean',
		},
	},
	decorators: [
		(Story) => (
			<div className="w-[500px]">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ChartContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		title: 'Revenue Over Time',
		description: 'Monthly revenue trend',
		children: (
			<div className="flex h-[300px] items-center justify-center rounded-lg bg-muted/50">
				<span className="text-muted-foreground">Chart content here</span>
			</div>
		),
	},
};

export const WithActions: Story = {
	args: {
		title: 'Revenue Over Time',
		description: 'Monthly revenue trend',
		actions: (
			<>
				<Button variant="outline" size="sm">
					Export
				</Button>
			</>
		),
		children: (
			<div className="flex h-[300px] items-center justify-center rounded-lg bg-muted/50">
				<span className="text-muted-foreground">Chart content here</span>
			</div>
		),
	},
};

export const Loading: Story = {
	args: {
		title: 'Loading Chart',
		description: 'Please wait...',
		loading: true,
		children: null,
	},
};

export const Empty: Story = {
	args: {
		title: 'No Data',
		description: 'Try adjusting your filters',
		empty: true,
		emptyMessage: 'No data available for the selected period',
		children: null,
	},
};

export const WithoutDescription: Story = {
	args: {
		title: 'Simple Chart',
		children: (
			<div className="flex h-[300px] items-center justify-center rounded-lg bg-muted/50">
				<span className="text-muted-foreground">Chart content here</span>
			</div>
		),
	},
};
