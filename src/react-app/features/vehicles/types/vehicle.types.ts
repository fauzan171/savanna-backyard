import type { BaseEntity } from '@/react-app/features/shared/types/api.types';

// Vehicle type enum
export type VehicleType = 'TrailBike' | 'StreetBike' | 'Car' | 'Jeep' | 'Other';

// Vehicle status enum
export type VehicleStatus = 'Available' | 'Rented' | 'Cleaning' | 'Maintenance' | 'Inactive';

// Vehicle entity matching backend
export interface Vehicle extends BaseEntity {
	name: string;
	plateNumber: string;
	type: VehicleType;
	brand: string | null;
	model: string | null;
	year: number | null;
	dailyRateIdr: number;
	dailyRateUsd: number | null;
	status: VehicleStatus;
	totalKm: number | null;
	photoUrl: string | null;
}

// Vehicle with details (for detail page)
export interface VehicleWithDetails extends Vehicle {
	currentBooking: BookingReference | null;
	upcomingBookings: BookingReference[];
	maintenanceHistory: MaintenanceRecord[];
	statusLogs: StatusLog[];
}

export interface BookingReference {
	id: string;
	startDate: string;
	endDate: string;
	status: string;
}

export interface MaintenanceRecord {
	id: string;
	type: 'Scheduled' | 'Repair' | 'Damage';
	description: string;
	completedAt: string | null;
}

export interface StatusLog {
	statusFrom: VehicleStatus;
	statusTo: VehicleStatus;
	notes: string | null;
	recordedBy: string;
	createdAt: string;
}

// API request types
export interface CreateVehicleRequest {
	name: string;
	plateNumber: string;
	type: VehicleType;
	brand?: string;
	model?: string;
	year?: number;
	dailyRateIdr: number;
	dailyRateUsd?: number;
	photoUrl?: string;
}

export interface UpdateVehicleRequest {
	name?: string;
	plateNumber?: string;
	type?: VehicleType;
	brand?: string;
	model?: string;
	year?: number;
	dailyRateIdr?: number;
	dailyRateUsd?: number;
	totalKm?: number;
	photoUrl?: string;
}

export interface UpdateStatusRequest {
	status: VehicleStatus;
	notes?: string;
}

// List filters
export interface VehicleFilters {
	search?: string;
	status?: VehicleStatus;
	type?: VehicleType;
}

// Availability types
export interface AvailabilityParams {
	startDate: string;
	endDate: string;
	type?: VehicleType;
	vehicleId?: string;
}

export interface AvailabilityResult {
	requestedPeriod: {
		startDate: string;
		endDate: string;
	};
	availableVehicles: Vehicle[];
	unavailableVehicles: UnavailableVehicle[];
	maintenanceVehicles: MaintenanceVehicle[];
}

export interface UnavailableVehicle {
	id: string;
	name: string;
	reason: string;
	conflictingBooking?: BookingReference;
}

export interface MaintenanceVehicle {
	id: string;
	name: string;
	reason: string;
	maintenanceEndDate?: string;
}

// Calendar types
export interface CalendarDay {
	date: string;
	status: 'available' | 'booked' | 'maintenance';
	bookingId?: string;
}

// Form types
export type VehicleFormData = CreateVehicleRequest;
