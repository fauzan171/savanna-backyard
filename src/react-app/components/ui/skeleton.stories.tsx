import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton, SkeletonText, SkeletonCard, SkeletonTable, SkeletonStatCards } from './skeleton';

const meta = {
	title: 'UI/Skeleton',
	component: Skeleton,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: 'select',
			options: ['text', 'circular', 'rectangular', 'card', 'avatar', 'table-row'],
		},
	},
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {
	args: {
		variant: 'text',
		className: 'w-full h-4',
	},
};

export const Circular: Story = {
	args: {
		variant: 'circular',
		width: 48,
		height: 48,
	},
};

export const Rectangular: Story = {
	args: {
		variant: 'rectangular',
		className: 'w-full h-24',
	},
};

export const Avatar: Story = {
	args: {
		variant: 'avatar',
	},
};

export const TextLines: Story = {
	render: () => <SkeletonText lines={3} className="w-64" />,
};

export const CardSkeleton: Story = {
	render: () => <SkeletonCard className="w-80" />,
};

export const TableSkeleton: Story = {
	render: () => (
		<div className="border border-border rounded-lg overflow-hidden">
			<SkeletonTable rows={4} columns={4} />
		</div>
	),
};

export const StatCardsSkeleton: Story = {
	render: () => <SkeletonStatCards count={4} />,
};

export const ProfileSkeleton: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<Skeleton variant="avatar" />
			<div className="space-y-2 flex-1">
				<Skeleton variant="text" className="w-32" />
				<Skeleton variant="text" className="w-48" />
			</div>
		</div>
	),
};
