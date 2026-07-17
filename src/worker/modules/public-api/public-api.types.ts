// Public API module types

// Public availability check response
export interface PublicAvailabilityResponse {
	success: true;
	data: {
		requestedPeriod: {
			startDate: string;
			endDate: string;
		};
		availableVehicles: Array<{
            id: string;
            name: string;
            type: 'TrailBike' | 'StreetBike' | 'Car' | 'Jeep' | 'Other';
            dailyRate: number;
            photoUrl: string | null;
        }>;
        unavailableVehicles: Array<{
            id: string;
            name: string;
            reason: string;
        }>;
        totalAvailable: number;
    };
}

// Public vehicle types response
export interface PublicVehicleTypesResponse {
	success: true;
	data: {
        types: Array<{
            name: 'TrailBike' | 'StreetBike' | 'Car' | 'Jeep' | 'Other';
            displayName: string;
            description: string | null;
            availableCount: number;
            priceRange: {
                min: number;
                max: number;
                currency: 'IDR';
            };
            features: string[];
        }>;
    };
}

// Public vehicle details response (filtered)
export interface PublicVehicleDetailsResponse {
	success: true;
	data: {
	 id: string;
        name: string;
        type: 'TrailBike' | 'StreetBike' | 'Car' | 'Jeep' | 'Other';
        brand: string | null;
        model: string | null;
        year: number | null;
        dailyRateIdr: number;
        photoUrl: string | null;
        specifications: {
            description: string | null;
        };
    };
}

// Error response type
export interface PublicErrorResponse {
    success: false;
    error: {
        code: 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR';
        message: string;
    };
}
