import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './status-badge';

const meta = {
	title: 'Data Display/StatusBadge',
	component: StatusBadge.Booking,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof StatusBadge.Booking>;

export default meta;

// ============================================
// BOOKING STATUS BADGES
// ============================================

export const BookingPending: Story = {
	args: {
		status: 'pending',
	},
};

export const BookingConfirmed: Story = {
	args: {
		status: 'confirmed',
	},
};

export const BookingActive: Story = {
	args: {
		status: 'active',
	},
};

export const BookingCompleted: Story = {
	args: {
		status: 'completed',
	},
};

export const BookingCancelled: Story = {
	args: {
		status: 'cancelled',
	},
};

export const AllBookingStatuses: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<StatusBadge.Booking status="pending" />
			<StatusBadge.Booking status="confirmed" />
			<StatusBadge.Booking status="active" />
			<StatusBadge.Booking status="completed" />
			<StatusBadge.Booking status="cancelled" />
		</div>
	),
};

// ============================================
// LEAD STATUS BADGES
// ============================================

export const LeadNew: Story = {
	render: () => <StatusBadge.Lead status="new" />,
};

export const LeadContacted: Story = {
	render: () => <StatusBadge.Lead status="contacted" />,
};

export const LeadNegotiating: Story = {
	render: () => <StatusBadge.Lead status="negotiating" />,
};

export const LeadConverted: Story = {
	render: () => <StatusBadge.Lead status="converted" />,
};

export const LeadLost: Story = {
	render: () => <StatusBadge.Lead status="lost" />,
};

export const AllLeadStatuses: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<StatusBadge.Lead status="new" />
			<StatusBadge.Lead status="contacted" />
			<StatusBadge.Lead status="negotiating" />
			<StatusBadge.Lead status="converted" />
			<StatusBadge.Lead status="lost" />
		</div>
	),
};

// ============================================
// PRIORITY BADGES
// ============================================

export const PriorityHot: Story = {
	render: () => <StatusBadge.Priority level="hot" />,
};

export const PriorityWarm: Story = {
	render: () => <StatusBadge.Priority level="warm" />,
};

export const PriorityCold: Story = {
	render: () => <StatusBadge.Priority level="cold" />,
};

export const AllPriorities: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<StatusBadge.Priority level="hot" />
			<StatusBadge.Priority level="warm" />
			<StatusBadge.Priority level="cold" />
		</div>
	),
};

export const PriorityWithoutDot: Story = {
	render: () => <StatusBadge.Priority level="hot" showDot={false} />,
};

// ============================================
// PAYMENT STATUS BADGES
// ============================================

export const PaymentPending: Story = {
	render: () => <StatusBadge.Payment status="pending" />,
};

export const PaymentVerified: Story = {
	render: () => <StatusBadge.Payment status="verified" />,
};

export const PaymentFailed: Story = {
	render: () => <StatusBadge.Payment status="failed" />,
};

export const AllPaymentStatuses: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<StatusBadge.Payment status="pending" />
			<StatusBadge.Payment status="verified" />
			<StatusBadge.Payment status="failed" />
		</div>
	),
};

// ============================================
// VEHICLE STATUS BADGES
// ============================================

export const VehicleAvailable: Story = {
	render: () => <StatusBadge.Vehicle status="available" />,
};

export const VehicleRented: Story = {
	render: () => <StatusBadge.Vehicle status="rented" />,
};

export const VehicleMaintenance: Story = {
	render: () => <StatusBadge.Vehicle status="maintenance" />,
};

export const VehicleInactive: Story = {
	render: () => <StatusBadge.Vehicle status="inactive" />,
};

export const AllVehicleStatuses: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<StatusBadge.Vehicle status="available" />
			<StatusBadge.Vehicle status="rented" />
			<StatusBadge.Vehicle status="maintenance" />
			<StatusBadge.Vehicle status="inactive" />
		</div>
	),
};

// ============================================
// SIZE VARIANTS
// ============================================

export const AllSizes: Story = {
	render: () => (
		<div className="flex items-center gap-2">
			<StatusBadge.Booking status="confirmed" size="sm" />
			<StatusBadge.Booking status="confirmed" size="md" />
			<StatusBadge.Booking status="confirmed" size="lg" />
		</div>
	),
};

// ============================================
// CUSTOM LABELS
// ============================================

export const CustomLabel: Story = {
	render: () => (
		<div className="flex flex-wrap gap-2">
			<StatusBadge.Booking status="active" label="In Progress" />
			<StatusBadge.Priority level="hot" label="Urgent" />
			<StatusBadge.Payment status="verified" label="Paid" />
		</div>
	),
};
