import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './label';
import { Input } from './input';

const meta = {
	title: 'UI/Label',
	component: Label,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: 'Label text',
	},
};

export const Required: Story = {
	args: {
		children: 'Email',
		required: true,
	},
};

export const WithInput: Story = {
	render: () => (
		<div className="space-y-2 w-64">
			<Label htmlFor="email" required>Email Address</Label>
			<Input id="email" placeholder="Enter your email" />
		</div>
	),
};

export const Disabled: Story = {
	render: () => (
		<div className="space-y-2 w-64">
			<Label>Disabled Field</Label>
			<Input disabled placeholder="Cannot edit" />
		</div>
	),
};
