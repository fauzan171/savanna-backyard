import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './checkbox';
import { Label } from './label';

const meta = {
	title: 'UI/Checkbox',
	component: Checkbox,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		size: {
			control: 'select',
			options: ['sm', 'md', 'lg'],
		},
	},
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {},
};

export const Checked: Story = {
	args: {
		checked: true,
	},
};

export const Indeterminate: Story = {
	args: {
		checked: 'indeterminate',
	},
};

export const Small: Story = {
	args: {
		size: 'sm',
	},
};

export const Large: Story = {
	args: {
		size: 'lg',
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
	},
};

export const DisabledChecked: Story = {
	args: {
		disabled: true,
		checked: true,
	},
};

export const WithLabel: Story = {
	render: () => (
		<div className="flex items-center gap-2">
			<Checkbox id="terms" />
			<Label htmlFor="terms">Accept terms and conditions</Label>
		</div>
	),
};

export const AllSizes: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<Checkbox size="sm" checked />
			<Checkbox size="md" checked />
			<Checkbox size="lg" checked />
		</div>
	),
};

export const CheckboxGroup: Story = {
	render: function CheckboxGroup() {
		const items = [
			{ id: 'notifications', label: 'Email notifications' },
			{ id: 'marketing', label: 'Marketing emails' },
			{ id: 'updates', label: 'Product updates' },
		];

		return (
			<div className="space-y-3">
				{items.map((item) => (
					<div key={item.id} className="flex items-center gap-2">
						<Checkbox id={item.id} />
						<Label htmlFor={item.id}>{item.label}</Label>
					</div>
				))}
			</div>
		);
	},
};
