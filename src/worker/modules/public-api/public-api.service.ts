import { PublicApiRepository } from './public-api.repository';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { ValidationError } from '@/worker/core/types/errors';
import type { SubmitLeadRequest, CheckAvailabilityQuery, GetVehicleTypesQuery } from './public-api.dto';

export class PublicApiService {
	constructor(
		private repo: PublicApiRepository,
		private configRepo: ConfigRepository
	) {}

	// 1. Submit Lead (from public web forms)
	async submitLead(data: SubmitLeadRequest): Promise<{
		id: string;
		status: string;
		createdAt: string;
	}> {
		// Auto-assign source based on data or default
		const source = data.source || 'Website';

		// Create lead with default priority
		const lead = await this.repo.createLead({
			name: data.name,
			phone: data.phone,
			email: data.email || null,
			notes: data.message || null,
			source,
			status: 'New',
			priority: 'Warm',
			assignedTo: null,
			followUpDate: null,
		});

		return {
			id: lead.id,
			status: lead.status,
			createdAt: lead.createdAt,
		};
	}

	// 2. Check Availability (filtered response)
	async checkAvailability(query: CheckAvailabilityQuery): Promise<{
		requestedPeriod: { startDate: string; endDate: string };
		availableVehicles: Array<{
			id: string;
			name: string;
			type: string;
			dailyRate: number;
			photoUrl: string | null;
		}>;
		unavailableVehicles: Array<{
			id: string;
			name: string;
			reason: string;
		}>;
		totalAvailable: number;
	}> {
		// Validate date range
		if (query.startDate > query.endDate) {
			throw new ValidationError('Start date must be before or equal to end date');
		}

		// Get vehicles by type if specified
		const vehicles = await this.repo.getAvailableVehicles(query.type);

		// Filter: only show Available status vehicles
		const available = vehicles
			.filter(v => v.status === 'Available')
			.map(v => ({
				id: v.id,
				name: v.name,
				type: v.type,
				dailyRate: v.dailyRateIdr,
				photoUrl: v.photoUrl,
			}));

		// Unavailable vehicles (maintenance or inactive) - no booking details exposed
		const unavailable = vehicles
			.filter(v => v.status !== 'Available')
			.map(v => ({
				id: v.id,
				name: v.name,
				reason: v.status === 'Maintenance' ? 'Under maintenance' : 'Currently unavailable',
			}));

		return {
			requestedPeriod: {
				startDate: query.startDate,
				endDate: query.endDate,
			},
			availableVehicles: available,
			unavailableVehicles: unavailable,
			totalAvailable: available.length,
		};
	}

	// 3. Get Vehicle Types (aggregated, filtered data)
	async getVehicleTypes(_query?: GetVehicleTypesQuery): Promise<{
		types: Array<{
			type: string;
			displayName: string;
			count: number;
			minDailyRate: number;
			maxDailyRate: number;
		}>;
	}> {
		const vehicles = await this.repo.getActiveVehicles();

		// Group by type
		const typeMap = new Map<string, {
			count: number;
			rates: number[];
		}>();

		for (const vehicle of vehicles) {
			const existing = typeMap.get(vehicle.type) || { count: 0, rates: [] };
			existing.count++;
			existing.rates.push(vehicle.dailyRateIdr);
			typeMap.set(vehicle.type, existing);
		}

		// Transform to response
		const types = Array.from(typeMap.entries()).map(([type, data]) => ({
			type,
			displayName: this.getDisplayName(type),
			count: data.count,
			minDailyRate: Math.min(...data.rates),
			maxDailyRate: Math.max(...data.rates),
		}));

		// Sort by type name
		types.sort((a, b) => a.type.localeCompare(b.type));

		return { types };
	}

	// 4. Get Vehicle Details (heavily filtered)
	async getVehicleDetails(id: string): Promise<{
		id: string;
		name: string;
		type: string;
		brand: string | null;
		model: string | null;
		year: number | null;
		dailyRate: number;
		photoUrl: string | null;
		specifications: {
			description: string | null;
		};
	} | null> {
		const vehicle = await this.repo.getVehicleById(id);

		if (!vehicle) {
			return null;
		}

		// FILTER OUT: plateNumber, status, totalKm, createdAt, updatedAt
		return {
			id: vehicle.id,
			name: vehicle.name,
			type: vehicle.type,
			brand: vehicle.brand,
			model: vehicle.model,
			year: vehicle.year,
			dailyRate: vehicle.dailyRateIdr,
			photoUrl: vehicle.photoUrl,
			specifications: {
				description: null, // Can be enhanced later with specs table
			},
		};
	}

	// Helper to get display name for vehicle type
	private getDisplayName(type: string): string {
		const displayNames: Record<string, string> = {
			TrailBike: 'Trail Bike',
			StreetBike: 'Street Bike',
			Car: 'Car',
			Jeep: 'Jeep',
			Other: 'Other',
		};
		return displayNames[type] || type;
	}

	// Internal: Check if public API is enabled
	async isPublicApiEnabled(): Promise<boolean> {
		return this.configRepo.getBoolean('public_api_enabled', false);
	}
}
