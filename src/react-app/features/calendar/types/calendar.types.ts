export type VehicleType = 'TrailBike' | 'StreetBike' | 'Car' | 'Jeep' | 'Other';

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

export interface CalendarMatrixFilters {
	month: string;
	type?: string;
	status?: string;
}
