import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from './alert';
import { Button } from './button';

const meta = {
	title: 'UI/Alert',
	component: Alert,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: 'select',
			options: ['info', 'success', 'warning', 'error'],
		},
	},
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
	args: {
		variant: 'info',
		title: 'Information',
		description: 'This is an informational alert message.',
	},
};

export const Success: Story = {
	args: {
		variant: 'success',
		title: 'Success!',
		description: 'Your changes have been saved successfully.',
	},
};

export const Warning: Story = {
	args: {
		variant: 'warning',
		title: 'Warning',
		description: 'This customer is blacklisted. Reason: Damaged vehicle on previous rental.',
	},
};

export const Error: Story = {
	args: {
		variant: 'error',
		title: 'Error',
		description: 'Failed to save changes. Please try again.',
	},
};

export const Dismissible: Story = {
	args: {
		variant: 'info',
		title: 'Dismissible Alert',
		description: 'Click the X button to dismiss this alert.',
		dismissible: true,
		onDismiss: () => alert('Dismissed!'),
	},
};

export const WithAction: Story = {
	args: {
		variant: 'warning',
		title: 'Action Required',
		description: 'Your session will expire in 5 minutes.',
		action: <Button size="sm">Extend Session</Button>,
	},
};

export const WithoutIcon: Story = {
	args: {
		variant: 'info',
		title: 'No Icon',
		description: 'This alert has no icon.',
		hideIcon: true,
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className="space-y-4 max-w-lg">
			<Alert variant="info" title="Info" description="This is an info message." />
			<Alert variant="success" title="Success" description="Operation completed successfully." />
			<Alert variant="warning" title="Warning" description="Please review before proceeding." />
			<Alert variant="error" title="Error" description="Something went wrong." />
		</div>
	),
};
