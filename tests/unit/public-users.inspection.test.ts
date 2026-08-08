import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicUsersService } from '@/worker/modules/public-users/public-users.service';
import type { PublicUsersRepository } from '@/worker/modules/public-users/public-users.repository';
import type { JwtService } from '@/worker/core/services/jwt.service';
import type { ConfigRepository } from '@/worker/core/repositories/config.repository';
import type { WhatsAppProvider } from '@/worker/core/services/providers';
import { ValidationError } from '@/worker/core/types/errors';

describe('PublicUsersService inspection flow', () => {
	let service: PublicUsersService;
	let repo: PublicUsersRepository;

	beforeEach(() => {
		repo = {
			findById: vi.fn(),
			findBookingByIdAndUser: vi.fn(),
			findBookingByNumberAndUser: vi.fn(),
			findChecklist: vi.fn(),
			findVehicleById: vi.fn(),
			createAndRecordCustomerInspection: vi.fn(),
			recordExistingCustomerInspection: vi.fn(),
		} as unknown as PublicUsersRepository;

		service = new PublicUsersService(
			repo,
			{ sign: vi.fn() } as unknown as JwtService,
			{ name: 'stub', sendMessage: vi.fn() } as unknown as WhatsAppProvider,
			{ getValue: vi.fn() } as unknown as ConfigRepository,
		);
	});

	it('[P0] rejects unknown customer inspection keys', async () => {
		vi.mocked(repo.findBookingByIdAndUser).mockResolvedValue({
			id: 'booking-1',
			bookingNumber: 'SVN-1',
			vehicleId: 'vehicle-1',
			customerId: 'customer-1',
			publicUserId: 'public-user-1',
			startDate: '2026-08-08T10:00:00.000Z',
			endDate: '2026-08-09T10:00:00.000Z',
			status: 'Confirmed',
			paymentStatus: 'settlement',
			paymentType: 'full',
			totalAmount: 100000,
			dpAmount: 0,
			remainingAmount: 0,
			fullyPaidAt: '2026-08-08T09:00:00.000Z',
			pickupConfirmed: false,
			pickupConfirmedAt: null,
			returnConfirmed: false,
			returnConfirmedAt: null,
			pickupChecklistId: null,
			returnChecklistId: null,
			customerPickupChecklistId: null,
			customerReturnChecklistId: null,
			startKm: null,
			createdAt: '2026-08-08T00:00:00.000Z',
		} as never);
		vi.mocked(repo.findChecklist).mockResolvedValue(null);
		vi.mocked(repo.findVehicleById).mockResolvedValue({
			id: 'vehicle-1',
			name: 'KLX 150',
			plateNumber: 'N 1234 AB',
			type: 'TrailBike',
			photoUrl: '/vehicle.jpg',
		} as never);

		await expect(
			service.submitCustomerInspection('public-user-1', 'booking-1', {
				qrCode: 'vehicle-1',
				phase: 'pickup',
				items: {
					fuel_level: 'ok',
					tire_condition: 'ok',
					brake_function: 'ok',
					lights_function: 'ok',
					horn_mirror: 'ok',
					body_condition: 'ok',
					helmet_count: 'ok',
					rogue_key: 'issue',
				},
				kmReading: 1200,
				fuelLevel: 70,
				photos: ['/api/v1/uploads/customer-inspections/booking-1/pickup/1.jpg'],
				notes: 'Unexpected key present',
			}),
		).rejects.toThrow(ValidationError);
	});
});
