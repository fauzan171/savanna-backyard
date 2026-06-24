import type { Booking, BookingAddon, Payment, Vehicle } from '@/worker/core/database/schema';

// Status types
export type BookingStatus = Booking['status'];
export type PaymentTerms = Booking['paymentTerms'];
export type Currency = Booking['currency'];
export type AddonType = BookingAddon['type'];

// Valid status transitions
export const BOOKING_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
	Pending: ['Confirmed', 'Cancelled'],
	pending_payment: ['Confirmed', 'Cancelled', 'payment_failed', 'expired'],
	Confirmed: ['Active', 'Cancelled'],
	Active: ['Completed', 'Cancelled'],
	Completed: [],
	Cancelled: [],
	payment_failed: ['pending_payment', 'Cancelled'],
	expired: [],
	refunded: [],
};

// Response types
export interface CustomerSummary {
	id: string;
	name: string;
	phone: string;
	email: string | null;
	isBlacklisted: boolean;
}

export interface VehicleSummary {
	id: string;
	name: string;
	plateNumber: string;
	type: Vehicle['type'];
	dailyRateIdr: number;
}

export interface AddonResponse {
	id: string;
	type: AddonType;
	description: string | null;
	amount: number;
	isMandatory: boolean;
}

export interface PaymentSummary {
	totalPaid: number;
	pendingAmount: number;
	remaining: number;
	isFullyPaid: boolean;
}

export interface PaymentInBooking {
	id: string;
	amount: number;
	method: Payment['method'];
	status: Payment['status'];
	createdAt: string;
}

export interface BookingResponse {
	id: string;
	bookingNumber: string;
	customer: CustomerSummary;
	vehicle: VehicleSummary;
	startDate: string;
	endDate: string;
	actualReturnDate: string | null;
	startKm: number | null;
	endKm: number | null;
	status: BookingStatus;
	paymentTerms: PaymentTerms;
	baseAmount: number;
	addonsAmount: number;
	lateFee: number;
	damageFee: number;
	totalPenalty: number;
	penaltyPaid: boolean;
	returnConfirmed: boolean;
	totalAmount: number;
	currency: Currency;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface BookingWithDetails extends BookingResponse {
	addons: AddonResponse[];
	payments: PaymentInBooking[];
	paymentSummary: PaymentSummary;
	createdBy: {
		id: string;
		name: string;
	} | null;
}

export interface BookingListItem extends BookingResponse {
	paymentStatus: PaymentSummary;
}

export interface LateFeeDetails {
	daysLate: number;
	dailyRate: number;
	multiplier: number;
	calculation: string;
}

export interface CompleteRentalResult extends BookingResponse {
	lateFeeDetails: LateFeeDetails | null;
	vehicleStatus: Vehicle['status'];
	damageFeeDetails: {
		flippedItems: number;
		ratePerItem: number;
		override: boolean;
		calculation: string;
	} | null;
}

export interface PenaltyBreakdown {
	lateFee: number;
	damageFee: number;
	totalPenalty: number;
	penaltyPaid: boolean;
	penaltyPaidAt: string | null;
	damageFeeDetails: CompleteRentalResult['damageFeeDetails'];
	lateFeeDetails: LateFeeDetails | null;
}

export interface ExtendRentalResult {
	id: string;
	originalEndDate: string;
	newEndDate: string;
	additionalDays: number;
	additionalAmount: number;
	newTotalAmount: number;
	extendedAt: string;
}

export interface AvailabilityResult {
	requestedPeriod: {
		startDate: string;
		endDate: string;
	};
	availableVehicles: {
		id: string;
		name: string;
		type: Vehicle['type'];
		dailyRateIdr: number;
		plateNumber: string;
	}[];
	unavailableVehicles: {
		id: string;
		name: string;
		reason: string;
		conflictingBooking?: {
			id: string;
			bookingNumber: string;
			startDate: string;
			endDate: string;
		};
	}[];
	maintenanceVehicles: {
		id: string;
		name: string;
		reason: string;
	}[];
}

export interface BookingStats {
	total: number;
	byStatus: Record<BookingStatus, number>;
	totalRevenue: number;
}
