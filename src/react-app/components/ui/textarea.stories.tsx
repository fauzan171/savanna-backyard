import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './textarea';

const meta = {
	title: 'UI/Textarea',
	component: Textarea,
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
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		placeholder: 'Enter your message...',
		className: 'w-80',
	},
};

export const WithValue: Story = {
	args: {
		defaultValue: 'This is some pre-filled text content.',
		className: 'w-80',
	},
};

export const Small: Story = {
	args: {
		size: 'sm',
		placeholder: 'Small textarea',
		className: 'w-80',
	},
};

export const Large: Story = {
	args: {
		size: 'lg',
		placeholder: 'Large textarea',
		className: 'w-80',
	},
};

export const WithError: Story = {
	args: {
		error: 'This field is required',
		placeholder: 'Enter text...',
		className: 'w-80',
	},
};

export const WithHint: Story = {
	args: {
		hint: 'Maximum 500 characters',
		placeholder: 'Enter your message...',
		className: 'w-80',
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		placeholder: 'Disabled textarea',
		className: 'w-80',
	},
};

export const ReadOnly: Story = {
	args: {
		readOnly: true,
		defaultValue: 'Read-only content',
		className: 'w-80',
	},
};

export const Resizable: Story = {
	args: {
		placeholder: 'This textarea can be resized vertically',
		className: 'w-80 resize-y',
	},
};
