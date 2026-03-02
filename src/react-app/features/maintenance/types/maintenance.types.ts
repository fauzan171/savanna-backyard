import { z } from 'zod';
import type { BaseEntity, UserReference } from '@/react-app/features/shared/types/api.types';

// ============================================
// MAINTENANCE STATUS & ENUMS
// ============================================

export type MaintenanceType = 'Scheduled' | 'Repair' | 'Damage';
export type MaintenanceStatus = 'Scheduled' | 'InProgress' | 'Completed';

// ============================================
// MAINTENANCE ENTITY TYPES
// ============================================

export interface MaintenancePhoto {
	url: string;
	caption?: string;
	uploadedAt?: string;
}

export interface Maintenance extends BaseEntity {
	vehicleId: string;
	type: MaintenanceType;
	description: string;
	cost: number | null;
	startDate: string;
	endDate: string | null;
	status: MaintenanceStatus;
	bookingId: string | null;
	photos: MaintenancePhoto[] | null;
	createdBy: string | null;
}

export interface MaintenanceWithDetails extends Maintenance {
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
	createdByUser?: UserReference | null;
}

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

// ============================================
// API REQUEST TYPES
// ============================================

export interface CreateMaintenanceRequest {
	vehicleId: string;
	type: MaintenanceType;
	description: string;
	cost?: number | null;
	startDate: string;
	endDate?: string | null;
	bookingId?: string | null;
	photos?: MaintenancePhoto[] | null;
	notes?: string | null;
}

export interface UpdateMaintenanceRequest {
	type?: MaintenanceType;
	description?: string;
	cost?: number | null;
	startDate?: string;
	endDate?: string | null;
	photos?: MaintenancePhoto[] | null;
	notes?: string | null;
}

export interface CompleteMaintenanceRequest {
	actualCost?: number | null;
	notes?: string | null;
}

export interface ListMaintenanceQuery {
	page?: number;
	limit?: number;
	status?: MaintenanceStatus;
	type?: MaintenanceType;
	vehicleId?: string;
}

export interface VehicleHistoryQuery {
	page?: number;
	limit?: number;
	type?: MaintenanceType;
}

export interface UpcomingQuery {
	days?: number;
}

// ============================================
// RESULT TYPES
// ============================================

export interface CreateMaintenanceResult {
	maintenance: Maintenance;
	vehicleStatusUpdate: {
		statusFrom: string;
		statusTo: string;
	};
}

export interface CompleteMaintenanceResult {
	maintenance: Maintenance;
	vehicleStatusUpdate: {
		statusFrom: string;
		statusTo: string;
	};
}

// ============================================
// FORM TYPES
// ============================================

export interface MaintenanceFormData {
	vehicleId: string;
	type: MaintenanceType;
	description: string;
	cost?: number;
	startDate: Date;
	endDate?: Date;
	bookingId?: string;
	notes?: string;
}

// ============================================
// ZOD SCHEMAS
// ============================================

export const maintenanceTypeSchema = z.enum(['Scheduled', 'Repair', 'Damage']);
export const maintenanceStatusSchema = z.enum(['Scheduled', 'InProgress', 'Completed']);

export const maintenancePhotoSchema = z.object({
	url: z.string().url('Invalid photo URL'),
	caption: z.string().max(200).optional(),
	uploadedAt: z.string().optional(),
});

export const maintenanceFormSchema = z.object({
	vehicleId: z.string().min(1, 'Vehicle is required'),
	type: maintenanceTypeSchema,
	description: z.string().min(5, 'Description must be at least 5 characters').max(1000),
	cost: z.number().nonnegative('Cost must be non-negative').optional(),
	startDate: z.date({
		required_error: 'Start date is required',
		invalid_type_error: 'Invalid start date',
	}),
	endDate: z.date().optional().nullable(),
	bookingId: z.string().optional(),
	notes: z.string().max(500).optional(),
}).refine((data) => {
	if (data.endDate && data.startDate) {
		return data.endDate >= data.startDate;
	}
	return true;
}, {
	message: 'End date must be on or after start date',
	path: ['endDate'],
});

export const completeMaintenanceFormSchema = z.object({
	actualCost: z.number().nonnegative('Cost must be non-negative').optional().nullable(),
	notes: z.string().max(500).optional(),
});

// ============================================
// STATUS HELPERS
// ============================================

export const statusTransitions: Record<MaintenanceStatus, MaintenanceStatus[]> = {
	Scheduled: ['InProgress'],
	InProgress: ['Completed'],
	Completed: [],
};

export function canTransitionTo(from: MaintenanceStatus, to: MaintenanceStatus): boolean {
	return statusTransitions[from]?.includes(to) ?? false;
}

export function getAvailableActions(status: MaintenanceStatus): Array<{
	action: string;
	label: string;
	variant: 'default' | 'destructive' | 'outline';
}> {
	const actions: Array<{ action: string; label: string; variant: 'default' | 'destructive' | 'outline' }> = [];

	switch (status) {
		case 'Scheduled':
			actions.push({ action: 'start', label: 'Start', variant: 'default' });
			break;
		case 'InProgress':
			actions.push({ action: 'complete', label: 'Complete', variant: 'default' });
			break;
		case 'Completed':
			// No actions available
			break;
	}

	return actions;
}
