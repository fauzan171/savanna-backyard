import { Badge } from '@/react-app/components/ui/badge';
import { cn } from '@/react-app/lib/utils';

// ============================================
// BOOKING STATUS BADGE
// ============================================

type BookingStatus = 'pending' | 'pending_payment' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'payment_failed' | 'expired' | 'refunded';

const bookingStatusConfig: Record<string, { label: string; className: string }> = {
	pending: {
		label: 'Pending',
		className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
	},
	pending_payment: {
		label: 'Pending Payment',
		className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
	},
	confirmed: {
		label: 'Confirmed',
		className: 'bg-blue-100 text-blue-800 border-blue-300',
	},
	active: {
		label: 'Active',
		className: 'bg-green-100 text-green-800 border-green-300',
	},
	completed: {
		label: 'Completed',
		className: 'bg-gray-100 text-gray-800 border-gray-300',
	},
	cancelled: {
		label: 'Cancelled',
		className: 'bg-red-100 text-red-800 border-red-300',
	},
	payment_failed: {
		label: 'Payment Failed',
		className: 'bg-red-100 text-red-800 border-red-300',
	},
	expired: {
		label: 'Expired',
		className: 'bg-orange-100 text-orange-800 border-orange-300',
	},
	refunded: {
		label: 'Refunded',
		className: 'bg-purple-100 text-purple-800 border-purple-300',
	},
};

interface BookingStatusBadgeProps {
	status: BookingStatus;
	label?: string;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

function BookingStatusBadge({ status, label, size = 'md', className }: BookingStatusBadgeProps) {
	const normalized = status.toLowerCase();
	const config = bookingStatusConfig[normalized] ?? {
		label: status,
		className: 'bg-gray-100 text-gray-800 border-gray-300',
	};
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

const leadStatusConfig: Record<string, { label: string; className: string }> = {
	new: {
		label: 'New',
		className: 'bg-blue-100 text-blue-800 border-blue-300',
	},
	contacted: {
		label: 'Contacted',
		className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
	},
	negotiating: {
		label: 'Negotiating',
		className: 'bg-orange-100 text-orange-800 border-orange-300',
	},
	converted: {
		label: 'Converted',
		className: 'bg-green-100 text-green-800 border-green-300',
	},
	lost: {
		label: 'Lost',
		className: 'bg-red-100 text-red-800 border-red-300',
	},
};

interface LeadStatusBadgeProps {
	status: LeadStatus;
	label?: string;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

function LeadStatusBadge({ status, label, size = 'md', className }: LeadStatusBadgeProps) {
	const normalized = status.toLowerCase();
	const config = leadStatusConfig[normalized] ?? {
		label: status,
		className: 'bg-gray-100 text-gray-800 border-gray-300',
	};
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

const priorityConfig: Record<string, { label: string; className: string; dot: string }> = {
	hot: {
		label: 'Hot',
		className: 'bg-red-100 text-red-800 border-red-300',
		dot: 'bg-red-500',
	},
	warm: {
		label: 'Warm',
		className: 'bg-orange-100 text-orange-800 border-orange-300',
		dot: 'bg-orange-500',
	},
	cold: {
		label: 'Cold',
		className: 'bg-blue-100 text-blue-800 border-blue-300',
		dot: 'bg-blue-500',
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
	const normalized = level.toLowerCase();
	const config = priorityConfig[normalized] ?? {
		label: level,
		className: 'bg-gray-100 text-gray-800 border-gray-300',
		dot: 'bg-gray-500',
	};
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

type PaymentStatus = 'pending' | 'verified' | 'failed' | 'settlement' | 'deny' | 'expire' | 'cancel' | 'refund';

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
	pending: {
		label: 'Pending',
		className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
	},
	verified: {
		label: 'Verified',
		className: 'bg-green-100 text-green-800 border-green-300',
	},
	settlement: {
		label: 'Settled',
		className: 'bg-green-100 text-green-800 border-green-300',
	},
	failed: {
		label: 'Failed',
		className: 'bg-red-100 text-red-800 border-red-300',
	},
	deny: {
		label: 'Denied',
		className: 'bg-red-100 text-red-800 border-red-300',
	},
	expire: {
		label: 'Expired',
		className: 'bg-orange-100 text-orange-800 border-orange-300',
	},
	cancel: {
		label: 'Cancelled',
		className: 'bg-red-100 text-red-800 border-red-300',
	},
	refund: {
		label: 'Refunded',
		className: 'bg-purple-100 text-purple-800 border-purple-300',
	},
};

interface PaymentStatusBadgeProps {
	status: PaymentStatus;
	label?: string;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

function PaymentStatusBadge({ status, label, size = 'md', className }: PaymentStatusBadgeProps) {
	const normalized = status.toLowerCase();
	const config = paymentStatusConfig[normalized] ?? {
		label: status,
		className: 'bg-gray-100 text-gray-800 border-gray-300',
	};
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

const vehicleStatusConfig: Record<string, { label: string; className: string }> = {
	available: {
		label: 'Available',
		className: 'bg-green-100 text-green-800 border-green-300',
	},
	rented: {
		label: 'Rented',
		className: 'bg-blue-100 text-blue-800 border-blue-300',
	},
	maintenance: {
		label: 'Maintenance',
		className: 'bg-orange-100 text-orange-800 border-orange-300',
	},
	inactive: {
		label: 'Inactive',
		className: 'bg-gray-100 text-gray-800 border-gray-300',
	},
};

interface VehicleStatusBadgeProps {
	status: VehicleStatus;
	label?: string;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

function VehicleStatusBadge({ status, label, size = 'md', className }: VehicleStatusBadgeProps) {
	const normalized = status.toLowerCase();
	const config = vehicleStatusConfig[normalized] ?? {
		label: status,
		className: 'bg-gray-100 text-gray-800 border-gray-300',
	};
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
