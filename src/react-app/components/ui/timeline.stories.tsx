import type { Meta, StoryObj } from '@storybook/react';
import { Timeline, BookingTimeline, ActivityTimeline } from './timeline';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

const meta = {
	title: 'UI/Timeline',
	component: Timeline,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Timeline>;

export default meta;

const sampleItems = [
	{
		id: '1',
		title: 'Booking Created',
		description: 'Booking request submitted by customer',
		date: new Date(2025, 0, 15, 10, 30),
		status: 'completed' as const,
	},
	{
		id: '2',
		title: 'Payment Received',
		description: 'Payment of Rp 1.500.000 confirmed',
		date: new Date(2025, 0, 15, 14, 22),
		status: 'completed' as const,
	},
	{
		id: '3',
		title: 'Vehicle Pickup',
		description: 'Customer picked up the motorcycle',
		date: new Date(2025, 0, 16, 8, 0),
		status: 'current' as const,
	},
	{
		id: '4',
		title: 'Vehicle Return',
		description: 'Scheduled return date',
		date: new Date(2025, 0, 18, 17, 0),
		status: 'pending' as const,
	},
];

export const Default: Story = {
	render: () => <Timeline items={sampleItems} />,
};

export const WithError: Story = {
	render: () => (
		<Timeline
			items={[
				{
					id: '1',
					title: 'Booking Created',
					description: 'Initial request',
					status: 'completed' as const,
				},
				{
					id: '2',
					title: 'Payment Failed',
					description: 'Transaction was declined',
					status: 'error' as const,
				},
				{
					id: '3',
					title: 'Retry Payment',
					description: 'Waiting for customer',
					status: 'pending' as const,
				},
			]}
		/>
	),
};

export const WithCustomIcons: Story = {
	render: () => (
		<Timeline
			items={[
				{
					id: '1',
					title: 'Completed',
					description: 'Task finished successfully',
					status: 'completed' as const,
					icon: <CheckCircle className="size-3" />,
				},
				{
					id: '2',
					title: 'In Progress',
					description: 'Currently working on',
					status: 'current' as const,
					icon: <Clock className="size-3" />,
				},
				{
					id: '3',
					title: 'Pending Review',
					description: 'Awaiting approval',
					status: 'pending' as const,
					icon: <AlertCircle className="size-3" />,
				},
			]}
		/>
	),
};

export const BookingActivity: Story = {
	render: () => (
		<BookingTimeline
			items={[
				{
					id: '1',
					title: 'Booking Created',
					description: 'Created by Admin via Dashboard',
					date: '15 Jan 2025, 10:30',
					status: 'completed' as const,
				},
				{
					id: '2',
					title: 'Payment Verified',
					description: 'Rp 4.500.000 via Bank Transfer',
					date: '15 Jan 2025, 14:22',
					status: 'completed' as const,
				},
				{
					id: '3',
					title: 'Vehicle Pickup',
					description: 'Honda CRF250 Rally picked up',
					date: '16 Jan 2025, 08:00',
					status: 'current' as const,
				},
				{
					id: '4',
					title: 'Scheduled Return',
					description: 'Expected return on 18 Jan 2025',
					date: '18 Jan 2025, 17:00',
					status: 'pending' as const,
				},
			]}
		/>
	),
};

export const ActivityLog: Story = {
	render: () => (
		<ActivityTimeline
			items={[
				{
					id: '1',
					title: 'Lead Converted',
					description: 'Lead #L-2025-042 converted to booking',
					date: '2 hours ago',
					status: 'completed' as const,
				},
				{
					id: '2',
					title: 'Payment Received',
					description: 'Booking #BK-2025-015 payment verified',
					date: '4 hours ago',
					status: 'completed' as const,
				},
				{
					id: '3',
					title: 'New Lead',
					description: 'New lead from WhatsApp: +62 812-xxx-xxx',
					date: 'Yesterday',
					status: 'pending' as const,
				},
			]}
			className="max-w-md"
		/>
	),
};

export const SimpleStatus: Story = {
	render: () => (
		<Timeline
			items={[
				{ id: '1', title: 'Step 1', status: 'completed' as const },
				{ id: '2', title: 'Step 2', status: 'completed' as const },
				{ id: '3', title: 'Step 3', status: 'current' as const },
				{ id: '4', title: 'Step 4', status: 'pending' as const },
				{ id: '5', title: 'Step 5', status: 'pending' as const },
			]}
		/>
	),
};
