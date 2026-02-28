import type { Meta, StoryObj } from '@storybook/react';
import { Avatar, AvatarGroup } from './avatar';

const meta = {
	title: 'UI/Avatar',
	component: Avatar,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		size: {
			control: 'select',
			options: ['xs', 'sm', 'md', 'lg', 'xl'],
		},
		shape: {
			control: 'select',
			options: ['circle', 'square'],
		},
	},
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		name: 'John Doe',
	},
};

export const WithImage: Story = {
	args: {
		name: 'John Doe',
		src: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
	},
};

export const Small: Story = {
	args: {
		name: 'John Doe',
		size: 'sm',
	},
};

export const Large: Story = {
	args: {
		name: 'John Doe',
		size: 'lg',
	},
};

export const ExtraLarge: Story = {
	args: {
		name: 'John Doe',
		size: 'xl',
	},
};

export const Square: Story = {
	args: {
		name: 'John Doe',
		shape: 'square',
	},
};

export const WithFallbackIcon: Story = {
	args: {
		name: 'John Doe',
		showFallbackIcon: true,
	},
};

export const AllSizes: Story = {
	render: () => (
		<div className="flex items-end gap-4">
			<Avatar name="John Doe" size="xs" />
			<Avatar name="John Doe" size="sm" />
			<Avatar name="John Doe" size="md" />
			<Avatar name="John Doe" size="lg" />
			<Avatar name="John Doe" size="xl" />
		</div>
	),
};

export const Group: Story = {
	render: () => (
		<AvatarGroup>
			<Avatar name="John Doe" />
			<Avatar name="Jane Smith" />
			<Avatar name="Bob Wilson" />
			<Avatar name="Alice Brown" />
			<Avatar name="Charlie Davis" />
		</AvatarGroup>
	),
};

export const GroupWithMax: Story = {
	render: () => (
		<AvatarGroup max={3}>
			<Avatar name="John Doe" />
			<Avatar name="Jane Smith" />
			<Avatar name="Bob Wilson" />
			<Avatar name="Alice Brown" />
			<Avatar name="Charlie Davis" />
		</AvatarGroup>
	),
};

export const SingleInitial: Story = {
	args: {
		name: 'Madonna',
	},
};

export const MultipleNames: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<Avatar name="John" />
			<Avatar name="John Doe" />
			<Avatar name="John Michael Doe" />
		</div>
	),
};
