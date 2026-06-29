// Re-export from database schema
export type { Vehicle, NewVehicle, VehicleStatusLog, NewVehicleStatusLog } from '@/worker/core/database/schema';

// Vehicle type enum
export type VehicleType = 'TrailBike' | 'StreetBike' | 'Car' | 'Jeep' | 'Other';
export type VehicleStatus = 'Available' | 'Rented' | 'Cleaning' | 'Maintenance' | 'Inactive';

// API-specific types
export interface VehicleResponse {
	id: string;
	name: string;
	plateNumber: string;
	type: VehicleType;
	brand: string | null;
	model: string | null;
	year: number | null;
	dailyRateIdr: number;
	dailyRateUsd: number | null;
	description: string | null;
	status: VehicleStatus;
	totalKm: number | null;
	photoUrl: string | null;
	createdAt: string;
}

export interface VehicleWithDetails extends VehicleResponse {
	currentBooking: {
		id: string;
		startDate: string;
		endDate: string;
		status: string;
	} | null;
	upcomingBookings: {
		id: string;
		startDate: string;
		endDate: string;
		status: string;
	}[];
	maintenanceHistory: {
		id: string;
		type: string;
		description: string;
		completedAt: string | null;
	}[];
	statusLogs: {
		statusFrom: string;
		statusTo: string;
		notes: string | null;
		recordedBy: string | null;
		createdAt: string;
	}[];
}

export interface AvailabilityResult {
	requestedPeriod: {
		startDate: string;
		endDate: string;
	};
	availableVehicles: {
		id: string;
		name: string;
		type: VehicleType;
		dailyRateIdr: number;
		plateNumber: string;
	}[];
	unavailableVehicles: {
		id: string;
		name: string;
		reason: string;
		conflictingBooking?: {
			id: string;
			startDate: string;
			endDate: string;
		};
	}[];
	maintenanceVehicles: {
		id: string;
		name: string;
		reason: string;
		maintenanceEndDate: string | null;
	}[];
}

export interface CalendarResult {
	vehicleId: string;
	month: string;
	calendar: {
		date: string;
		status: 'available' | 'booked' | 'maintenance';
		bookingId?: string;
	}[];
}

export interface CalendarMatrixCell {
	status: 'available' | 'booked' | 'maintenance' | 'inactive';
	booking?: {
		id: string;
		bookingNumber: string;
		customerName: string;
		customerPhone: string;
	};
}

export interface CalendarMatrixVehicle {
	id: string;
	name: string;
	type: string;
	plateNumber: string;
	status: string;
	dates: Record<string, CalendarMatrixCell>;
}

export interface CalendarMatrixResult {
	month: string;
	vehicles: CalendarMatrixVehicle[];
}
