import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicApiService } from '@/worker/modules/public-api/public-api.service';
import { PublicApiRepository } from '@/worker/modules/public-api/public-api.repository';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { ValidationError } from '@/worker/core/types/errors';
import type { Vehicle, Booking } from '@/worker/core/database/schema';

function makeVehicle(): Vehicle {
	return {
		id: 'v-1',
		name: 'CRF 150L',
		status: 'Available',
		category: 'Adventure',
		description: 'Curated public trail bike',
		photoUrl: 'https://example.com/crf-150l.jpg',
		dailyRateIdr: 450000,
	} as unknown as Vehicle;
}

describe('PublicApiService — equipment + availability', () => {
	let service: PublicApiService;
	let repo: PublicApiRepository;

	beforeEach(() => {
		repo = {
			getActiveEquipment: vi.fn(),
			getEquipmentById: vi.fn(),
			getVehicleById: vi.fn(),
			getVehicleBookingsInRange: vi.fn(),
		} as unknown as PublicApiRepository;
		const configRepo = { getValue: vi.fn().mockResolvedValue(null) } as unknown as ConfigRepository;
		service = new PublicApiService(repo, configRepo, 'https://api.test');
	});

	describe('getPublicEquipment', () => {
		it('[P0] should return the public equipment shape', async () => {
			vi.mocked(repo.getActiveEquipment).mockResolvedValue([
				{ id: 'e1', name: 'Helm', category: 'Safety', description: 'd', dailyRateIdr: 50000, image: null, stock: 5, minRentalDays: 1, isActive: true, sortOrder: 1 } as never,
			]);
			const result = await service.getPublicEquipment();
			expect(result[0]).toMatchObject({ id: 'e1', dailyRateIdr: 50000 });
		});
	});

	describe('getVehicleAvailabilityForMonth', () => {
		it('[P0] should reject an invalid month', async () => {
			await expect(service.getVehicleAvailabilityForMonth('v-1', '2026-7')).rejects.toThrow(ValidationError);
			await expect(service.getVehicleAvailabilityForMonth('v-1', 'not-a-month')).rejects.toThrow(ValidationError);
		});

		it('[P0] should mark booked dates as [startDate, endDate) and leave endDate free', async () => {
			vi.mocked(repo.getVehicleById).mockResolvedValue(makeVehicle());
			// Booking July 1 -> July 3 occupies July 1 & 2 (endDate exclusive, back-to-back)
			const booking = { vehicleId: 'v-1', startDate: '2026-07-01', endDate: '2026-07-03', status: 'Confirmed' } as Booking;
			vi.mocked(repo.getVehicleBookingsInRange).mockResolvedValue([booking]);

			const result = await service.getVehicleAvailabilityForMonth('v-1', '2026-07');

			expect(result.bookedDates).toEqual(['2026-07-01', '2026-07-02']);
			expect(result.availableDates).toContain('2026-07-03'); // return day is free
			expect(result.availableDates).toContain('2026-07-31');
			expect(result.bookedDates).toHaveLength(2);
			// total days in July = 31
			expect(result.availableDates.length + result.bookedDates.length).toBe(31);
		});

		it('[P0] should throw when the vehicle does not exist', async () => {
			vi.mocked(repo.getVehicleById).mockResolvedValue(null);
			await expect(service.getVehicleAvailabilityForMonth('v-1', '2026-07')).rejects.toThrow(ValidationError);
		});

		it('[P0] should mark all dates available when there are no bookings', async () => {
			vi.mocked(repo.getVehicleById).mockResolvedValue(makeVehicle());
			vi.mocked(repo.getVehicleBookingsInRange).mockResolvedValue([]);
			const result = await service.getVehicleAvailabilityForMonth('v-1', '2026-02');
			expect(result.bookedDates).toHaveLength(0);
			expect(result.availableDates).toHaveLength(28); // 2026 is not a leap year
		});
	});
});
