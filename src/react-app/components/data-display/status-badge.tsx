import { Badge } from '@/react-app/components/ui/badge';
import { cn } from '@/react-app/lib/utils';

// ============================================
// BOOKING STATUS BADGE
// ============================================

type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';

const bookingStatusConfig: Record<BookingStatus, { label: string; className: string }> = {
	pending: {
		label: 'Pending',
		className: 'bg-[hsl(var(--status-pending))]/10 text-[hsl(var(--status-pending))] border-[hsl(var(--status-pending))]/30',
	},
	confirmed: {
		label: 'Confirmed',
		className: 'bg-[hsl(var(--status-confirmed))]/10 text-[hsl(var(--status-confirmed))] border-[hsl(var(--status-confirmed))]/30',
	},
	active: {
		label: 'Active',
		className: 'bg-[hsl(var(--status-active))]/10 text-[hsl(var(--status-active))] border-[hsl(var(--status-active))]/30',
	},
	completed: {
		label: 'Completed',
		className: 'bg-[hsl(var(--status-completed))]/10 text-[hsl(var(--status-completed))] border-[hsl(var(--status-completed))]/30',
	},
	cancelled: {
		label: 'Cancelled',
		className: 'bg-[hsl(var(--status-cancelled))]/10 text-[hsl(var(--status-cancelled))] border-[hsl(var(--status-cancelled))]/30',
	},
};

interface BookingStatusBadgeProps {
	status: BookingStatus;
	label?: string;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

function BookingStatusBadge({ status, label, size = 'md', className }: BookingStatusBadgeProps) {
	const config = bookingStatusConfig[status];
	return (
		<Badge
			variant="outline"
			size={size}
			className={cn(config.className, className)}
		>
			{label || config.label}
		</Badge>
	);
}

// ============================================
// LEAD STATUS BADGE
// ============================================

type LeadStatus = 'new' | 'contacted' | 'negotiating' | 'converted' | 'lost';

const leadStatusConfig: Record<LeadStatus, { label: string; className: string }> = {
	new: {
		label: 'New',
		className: 'bg-[hsl(var(--lead-new))]/10 text-[hsl(var(--lead-new))] border-[hsl(var(--lead-new))]/30',
	},
	contacted: {
		label: 'Contacted',
		className: 'bg-[hsl(var(--lead-contacted))]/10 text-[hsl(var(--lead-contacted))] border-[hsl(var(--lead-contacted))]/30',
	},
	negotiating: {
		label: 'Negotiating',
		className: 'bg-[hsl(var(--lead-negotiating))]/10 text-[hsl(var(--lead-negotiating))] border-[hsl(var(--lead-negotiating))]/30',
	},
	converted: {
		label: 'Converted',
		className: 'bg-[hsl(var(--lead-converted))]/10 text-[hsl(var(--lead-converted))] border-[hsl(var(--lead-converted))]/30',
	},
	lost: {
		label: 'Lost',
		className: 'bg-[hsl(var(--lead-lost))]/10 text-[hsl(var(--lead-lost))] border-[hsl(var(--lead-lost))]/30',
	},
};

interface LeadStatusBadgeProps {
	status: LeadStatus;
	label?: string;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

function LeadStatusBadge({ status, label, size = 'md', className }: LeadStatusBadgeProps) {
	const config = leadStatusConfig[status];
	return (
		<Badge
			variant="outline"
			size={size}
			className={cn(config.className, className)}
		>
			{label || config.label}
		</Badge>
	);
}

// ============================================
// LEAD PRIORITY BADGE
// ============================================

type LeadPriority = 'hot' | 'warm' | 'cold';

const priorityConfig: Record<LeadPriority, { label: string; className: string; dot: string }> = {
	hot: {
		label: 'Hot',
		className: 'bg-[hsl(var(--priority-hot))]/10 text-[hsl(var(--priority-hot))] border-[hsl(var(--priority-hot))]/30',
		dot: 'bg-[hsl(var(--priority-hot))]',
	},
	warm: {
		label: 'Warm',
		className: 'bg-[hsl(var(--priority-warm))]/10 text-[hsl(var(--priority-warm))] border-[hsl(var(--priority-warm))]/30',
		dot: 'bg-[hsl(var(--priority-warm))]',
	},
	cold: {
		label: 'Cold',
		className: 'bg-[hsl(var(--priority-cold))]/10 text-[hsl(var(--priority-cold))] border-[hsl(var(--priority-cold))]/30',
		dot: 'bg-[hsl(var(--priority-cold))]',
	},
};

interface PriorityBadgeProps {
	level: LeadPriority;
	label?: string;
	size?: 'sm' | 'md' | 'lg';
	showDot?: boolean;
	className?: string;
}

function PriorityBadge({ level, label, size = 'md', showDot = true, className }: PriorityBadgeProps) {
	const config = priorityConfig[level];
	return (
		<Badge
			variant="outline"
			size={size}
			className={cn(config.className, className)}
		>
			{showDot && <span className={cn('size-1.5 rounded-full', config.dot)} />}
			{label || config.label}
		</Badge>
	);
}

// ============================================
// PAYMENT STATUS BADGE
// ============================================

type PaymentStatus = 'pending' | 'verified' | 'failed';

const paymentStatusConfig: Record<PaymentStatus, { label: string; className: string }> = {
	pending: {
		label: 'Pending',
		className: 'bg-[hsl(var(--payment-pending))]/10 text-[hsl(var(--payment-pending))] border-[hsl(var(--payment-pending))]/30',
	},
	verified: {
		label: 'Verified',
		className: 'bg-[hsl(var(--payment-verified))]/10 text-[hsl(var(--payment-verified))] border-[hsl(var(--payment-verified))]/30',
	},
	failed: {
		label: 'Failed',
		className: 'bg-[hsl(var(--payment-failed))]/10 text-[hsl(var(--payment-failed))] border-[hsl(var(--payment-failed))]/30',
	},
};

interface PaymentStatusBadgeProps {
	status: PaymentStatus;
	label?: string;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

function PaymentStatusBadge({ status, label, size = 'md', className }: PaymentStatusBadgeProps) {
	const config = paymentStatusConfig[status];
	return (
		<Badge
			variant="outline"
			size={size}
			className={cn(config.className, className)}
		>
			{label || config.label}
		</Badge>
	);
}

// ============================================
// VEHICLE STATUS BADGE
// ============================================

type VehicleStatus = 'available' | 'rented' | 'maintenance' | 'inactive';

const vehicleStatusConfig: Record<VehicleStatus, { label: string; className: string }> = {
	available: {
		label: 'Available',
		className: 'bg-[hsl(var(--vehicle-available))]/10 text-[hsl(var(--vehicle-available))] border-[hsl(var(--vehicle-available))]/30',
	},
	rented: {
		label: 'Rented',
		className: 'bg-[hsl(var(--vehicle-rented))]/10 text-[hsl(var(--vehicle-rented))] border-[hsl(var(--vehicle-rented))]/30',
	},
	maintenance: {
		label: 'Maintenance',
		className: 'bg-[hsl(var(--vehicle-maintenance))]/10 text-[hsl(var(--vehicle-maintenance))] border-[hsl(var(--vehicle-maintenance))]/30',
	},
	inactive: {
		label: 'Inactive',
		className: 'bg-[hsl(var(--vehicle-inactive))]/10 text-[hsl(var(--vehicle-inactive))] border-[hsl(var(--vehicle-inactive))]/30',
	},
};

interface VehicleStatusBadgeProps {
	status: VehicleStatus;
	label?: string;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

function VehicleStatusBadge({ status, label, size = 'md', className }: VehicleStatusBadgeProps) {
	const config = vehicleStatusConfig[status];
	return (
		<Badge
			variant="outline"
			size={size}
			className={cn(config.className, className)}
		>
			{label || config.label}
		</Badge>
	);
}

// ============================================
// COMPOSED STATUS BADGE COMPONENT
// ============================================

export const StatusBadge = {
	Booking: BookingStatusBadge,
	Lead: LeadStatusBadge,
	Priority: PriorityBadge,
	Payment: PaymentStatusBadge,
	Vehicle: VehicleStatusBadge,
};

// Type exports
export type {
	BookingStatus,
	LeadStatus,
	LeadPriority,
	PaymentStatus,
	VehicleStatus,
	BookingStatusBadgeProps,
	LeadStatusBadgeProps,
	PriorityBadgeProps,
	PaymentStatusBadgeProps,
	VehicleStatusBadgeProps,
};
