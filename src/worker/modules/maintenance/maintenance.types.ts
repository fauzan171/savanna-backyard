// Maintenance module types

// Re-export maintenance types from schema
export type { MaintenanceRecord, NewMaintenanceRecord } from '@/worker/core/database/schema/maintenance';

// Photo structure for maintenance records
export interface MaintenancePhoto {
	url: string;
	caption?: string;
	uploadedAt?: string;
}

// Maintenance response format
export interface MaintenanceResponse {
	id: string;
	vehicleId: string;
	type: 'Scheduled' | 'Repair' | 'Damage';
	description: string;
	cost: number | null;
	startDate: string;
	endDate: string | null;
	status: 'Scheduled' | 'InProgress' | 'Completed';
	bookingId: string | null;
	photos: MaintenancePhoto[] | null;
	createdBy: string | null;
	createdAt: string;
	updatedAt: string;
}

// Maintenance with related details
export interface MaintenanceWithDetails extends MaintenanceResponse {
	vehicle?: {
		id: string;
		name: string;
		plateNumber: string;
		status: string;
	} | null;
	booking?: {
		id: string;
		bookingNumber: string;
		customerName: string;
		startDate: string;
		endDate: string;
	} | null;
	createdByUser?: {
		id: string;
		name: string;
	} | null;
}

// Maintenance history item for vehicle history endpoint
export interface MaintenanceHistoryItem {
	id: string;
	type: string;
	description: string;
	cost: number | null;
	startDate: string;
	endDate: string | null;
	status: string;
	photos: MaintenancePhoto[] | null;
	completedAt: string | null;
}

// Upcoming maintenance item
export interface UpcomingMaintenanceItem {
	id: string;
	vehicleId: string;
	vehicleName: string;
	vehiclePlateNumber: string;
	type: string;
	description: string;
	scheduledDate: string;
	expectedEnd: string | null;
	daysUntil: number;
	isOverdue: boolean;
}

// Result types for operations
export interface CreateMaintenanceResult {
	maintenance: MaintenanceResponse;
	vehicleStatusUpdate: {
		statusFrom: string;
		statusTo: string;
	};
}

export interface CompleteMaintenanceResult {
	maintenance: MaintenanceResponse;
	vehicleStatusUpdate: {
		statusFrom: string;
		statusTo: string;
	};
}

// Vehicle maintenance history summary
export interface VehicleMaintenanceSummary {
	vehicle: {
		id: string;
		name: string;
		plateNumber: string;
	};
	summary: {
		totalRecords: number;
		totalCost: number;
		lastMaintenanceDate: string | null;
	};
	records: MaintenanceHistoryItem[];
}
