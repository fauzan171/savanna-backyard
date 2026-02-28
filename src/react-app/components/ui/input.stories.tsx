import type { Meta, StoryObj } from '@storybook/react';
import { Search, Eye, EyeOff } from 'lucide-react';
import { Input } from './input';

const meta = {
	title: 'UI/Input',
	component: Input,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		type: {
			control: 'select',
			options: ['text', 'email', 'password', 'number', 'tel', 'url'],
		},
	},
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		placeholder: 'Enter text...',
	},
};

export const WithLabel: Story = {
	args: {
		placeholder: 'Enter your email',
	},
	decorators: [
		(Story) => (
			<div className="space-y-2 w-64">
				<label className="text-sm font-medium">Email</label>
				<Story />
			</div>
		),
	],
};

export const WithLeftIcon: Story = {
	args: {
		placeholder: 'Search...',
		leftIcon: <Search className="size-4" />,
	},
};

export const WithRightIcon: Story = {
	args: {
		placeholder: 'Password',
		type: 'password',
		rightIcon: <Eye className="size-4" />,
	},
};

export const WithError: Story = {
	args: {
		placeholder: 'Enter email',
		error: 'Please enter a valid email address',
		defaultValue: 'invalid-email',
	},
};

export const WithHint: Story = {
	args: {
		placeholder: 'Enter username',
		hint: 'Username must be at least 3 characters',
	},
};

export const Disabled: Story = {
	args: {
		placeholder: 'Disabled input',
		disabled: true,
	},
};

export const Password: Story = {
	args: {
		type: 'password',
		placeholder: 'Enter password',
	},
};
