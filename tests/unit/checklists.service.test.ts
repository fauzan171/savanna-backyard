import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChecklistsService } from '@/worker/modules/checklists/checklists.service';
import type { ChecklistsRepository } from '@/worker/modules/checklists/checklists.repository';
import type { BookingsRepository } from '@/worker/modules/bookings/bookings.repository';

describe('ChecklistsService', () => {
	let service: ChecklistsService;
	let checklistRepo: ChecklistsRepository;
	let bookingRepo: BookingsRepository;

	beforeEach(() => {
		checklistRepo = {
			findByBookingId: vi.fn(),
		} as unknown as ChecklistsRepository;

		bookingRepo = {} as BookingsRepository;
		service = new ChecklistsService(checklistRepo, bookingRepo);
	});

	it('[P0] returns admin and customer checklist variants while preserving legacy pickup/return aliases', async () => {
		vi.mocked(checklistRepo.findByBookingId).mockResolvedValue({
			customerPickup: {
				id: 'customer-pickup',
				bookingId: 'booking-1',
				vehicleId: 'vehicle-1',
				type: 'pickup',
				submissionSource: 'customer',
				items: '{"fuel_level":"ok"}',
				kmReading: 10,
				fuelLevel: 80,
				photos: '["/pickup.jpg"]',
				notes: 'Customer note',
				damageNotes: null,
				createdBy: null,
				createdByPublicUserId: 'public-user-1',
				createdAt: '2026-08-08T00:00:00.000Z',
				updatedAt: '2026-08-08T00:00:00.000Z',
			},
			adminPickup: {
				id: 'admin-pickup',
				bookingId: 'booking-1',
				vehicleId: 'vehicle-1',
				type: 'pickup',
				submissionSource: 'admin',
				items: '{"fuel_level":true}',
				kmReading: 12,
				fuelLevel: 80,
				photos: '["/admin-pickup.jpg"]',
				notes: 'Admin note',
				damageNotes: null,
				createdBy: 'staff-1',
				createdByPublicUserId: null,
				createdAt: '2026-08-08T00:00:00.000Z',
				updatedAt: '2026-08-08T00:00:00.000Z',
			},
			customerReturn: null,
			adminReturn: {
				id: 'admin-return',
				bookingId: 'booking-1',
				vehicleId: 'vehicle-1',
				type: 'return',
				submissionSource: 'admin',
				items: '{"body_condition":false}',
				kmReading: 20,
				fuelLevel: 40,
				photos: '["/admin-return.jpg"]',
				notes: 'Return note',
				damageNotes: 'Scratch found',
				createdBy: 'staff-2',
				createdByPublicUserId: null,
				createdAt: '2026-08-08T00:00:00.000Z',
				updatedAt: '2026-08-08T00:00:00.000Z',
			},
		});

		const result = await service.getByBookingId('booking-1');

		expect(result.customerPickup?.id).toBe('customer-pickup');
		expect(result.adminPickup?.id).toBe('admin-pickup');
		expect(result.customerReturn).toBeNull();
		expect(result.adminReturn?.id).toBe('admin-return');
		expect(result.pickup?.id).toBe('admin-pickup');
		expect(result.return?.id).toBe('admin-return');
	});
});
