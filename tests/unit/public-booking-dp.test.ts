import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicApiService } from '@/worker/modules/public-api/public-api.service';
import { PublicApiRepository } from '@/worker/modules/public-api/public-api.repository';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import type { Vehicle, Customer, Booking } from '@/worker/core/database/schema';

const vehicle: Vehicle = { id: 'v1', name: 'CRF 150L', dailyRateIdr: 200_000, status: 'Available' } as unknown as Vehicle;
const customer: Customer = { id: 'c1', name: 'Budi', phone: '6281', email: null } as unknown as Customer;

function makeBooking(): Booking {
	return {
		id: 'b1', bookingNumber: 'SVN-2026-0001', customerId: 'c1', vehicleId: 'v1',
		startDate: '2026-07-01', endDate: '2026-07-03', status: 'pending_payment',
		totalAmount: 0, baseAmount: 0, equipmentTotalAmount: 0, dpAmount: 0, remainingAmount: 0,
		paymentType: 'full', paymentStatus: 'pending',
	} as unknown as Booking;
}

describe('PublicApiService.createPublicBooking — equipment + DP', () => {
	let repo: PublicApiRepository;
	let configRepo: ConfigRepository;
	let service: PublicApiService;

	beforeEach(() => {
		repo = {
			getVehicleById: vi.fn().mockResolvedValue(vehicle),
			isVehicleAvailableForDates: vi.fn().mockResolvedValue(true),
			findCustomerByPhone: vi.fn().mockResolvedValue(null),
			createCustomer: vi.fn().mockResolvedValue(customer),
			createBooking: vi.fn().mockImplementation(async (data) => ({ ...makeBooking(), ...data })),
			updateBooking: vi.fn().mockResolvedValue(undefined),
			getActiveEquipmentByIds: vi.fn().mockResolvedValue([]),
			createBookingEquipment: vi.fn().mockResolvedValue(undefined),
		} as unknown as PublicApiRepository;
		configRepo = { getNumber: vi.fn().mockResolvedValue(30), getBoolean: vi.fn(), getValue: vi.fn() } as unknown as ConfigRepository;
		service = new PublicApiService(repo, configRepo, 'https://api.test');
	});

	it('[P0] should compute equipment total and add it to the booking total', async () => {
		vi.mocked(repo.getActiveEquipmentByIds).mockResolvedValue([
			{ id: 'e1', dailyRateIdr: 50_000, isActive: true } as never,
			{ id: 'e2', dailyRateIdr: 25_000, isActive: true } as never,
		]);

		const result = await service.createPublicBooking(
			{ vehicleId: 'v1', startDate: '2026-07-01', endDate: '2026-07-03', customerName: 'Budi', customerPhone: '6281', equipment: [{ equipmentId: 'e1', quantity: 1 }, { equipmentId: 'e2', quantity: 2 }] },
			{ vendor: 'manual', config: {} },
		);

		// base = 200000 * 2 days = 400000; equipment = (50000*1*2) + (25000*2*2) = 100000 + 100000 = 200000
		expect(result.totalAmount).toBe(600_000);
		expect(result.paymentType).toBe('full');
		expect(repo.createBookingEquipment).toHaveBeenCalledWith(expect.arrayContaining([
			expect.objectContaining({ equipmentId: 'e1', unitPrice: 50_000, totalPrice: 100_000 }),
			expect.objectContaining({ equipmentId: 'e2', unitPrice: 25_000, totalPrice: 100_000 }),
		]));
	});

	it('[P0] should compute the DP amount from dp_percentage for paymentType=dp', async () => {
		const result = await service.createPublicBooking(
			{ vehicleId: 'v1', startDate: '2026-07-01', endDate: '2026-07-03', customerName: 'Budi', customerPhone: '6281', paymentType: 'dp' },
			{ vendor: 'manual', config: {} },
		);

		// total = 400000; DP 30% = 120000; remaining = 280000
		expect(result.paymentType).toBe('dp');
		expect(result.dpAmount).toBe(120_000);
		expect(result.remainingAmount).toBe(280_000);
		expect(configRepo.getNumber).toHaveBeenCalledWith('dp_percentage', 30);
		expect(repo.createBooking).toHaveBeenCalledWith(expect.objectContaining({ paymentType: 'dp', paymentTerms: 'DP_Pickup', dpAmount: 120_000, remainingAmount: 280_000 }));
	});

	it('[P0] should link the booking to the public user when provided', async () => {
		await service.createPublicBooking(
			{ vehicleId: 'v1', startDate: '2026-07-01', endDate: '2026-07-03', customerName: 'Budi', customerPhone: '6281' },
			{ vendor: 'manual', config: {} },
			{ publicUserId: 'pu-1' },
		);
		expect(repo.createBooking).toHaveBeenCalledWith(expect.objectContaining({ publicUserId: 'pu-1' }));
	});

	it('[P0] should reject an unknown equipment id', async () => {
		vi.mocked(repo.getActiveEquipmentByIds).mockResolvedValue([]); // none found
		await expect(
			service.createPublicBooking(
				{ vehicleId: 'v1', startDate: '2026-07-01', endDate: '2026-07-03', customerName: 'Budi', customerPhone: '6281', equipment: [{ equipmentId: 'nope', quantity: 1 }] },
				{ vendor: 'manual', config: {} },
			),
		).rejects.toThrow();
	});
});
