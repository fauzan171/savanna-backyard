import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';

const meta = {
	title: 'UI/Badge',
	component: Badge,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: 'select',
			options: ['default', 'success', 'warning', 'error', 'info', 'outline', 'primary'],
		},
		size: {
			control: 'select',
			options: ['sm', 'md', 'lg'],
		},
		shape: {
			control: 'select',
			options: ['rounded', 'pill'],
		},
	},
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: 'Badge',
	},
};

export const Success: Story = {
	args: {
		variant: 'success',
		children: 'Completed',
	},
};

export const Warning: Story = {
	args: {
		variant: 'warning',
		children: 'Pending',
	},
};

export const Error: Story = {
	args: {
		variant: 'error',
		children: 'Failed',
	},
};

export const Info: Story = {
	args: {
		variant: 'info',
		children: 'Information',
	},
};

export const Outline: Story = {
	args: {
		variant: 'outline',
		children: 'Outline',
	},
};

export const Primary: Story = {
	args: {
		variant: 'primary',
		children: 'Primary',
	},
};

export const Small: Story = {
	args: {
		size: 'sm',
		children: 'Small',
	},
};

export const Large: Story = {
	args: {
		size: 'lg',
		children: 'Large',
	},
};

export const Pill: Story = {
	args: {
		shape: 'pill',
		children: 'Pill Badge',
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<Badge variant="default">Default</Badge>
			<Badge variant="success">Success</Badge>
			<Badge variant="warning">Warning</Badge>
			<Badge variant="error">Error</Badge>
			<Badge variant="info">Info</Badge>
			<Badge variant="outline">Outline</Badge>
			<Badge variant="primary">Primary</Badge>
		</div>
	),
};
