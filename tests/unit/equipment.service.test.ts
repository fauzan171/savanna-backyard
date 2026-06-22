import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EquipmentService } from '@/worker/modules/equipment/equipment.service';
import { EquipmentRepository } from '@/worker/modules/equipment/equipment.repository';
import { NotFoundError } from '@/worker/core/types/errors';
import type { Equipment } from '@/worker/core/database/schema';

function makeEquipment(overrides: Partial<Equipment> = {}): Equipment {
	return {
		id: 'eq-1',
		name: 'Helm Full Face',
		category: 'Safety',
		description: 'SNI helm',
		dailyRateIdr: 50000,
		image: null,
		stock: 10,
		isActive: true,
		minRentalDays: 1,
		sortOrder: 1,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...overrides,
	};
}

describe('EquipmentService', () => {
	let service: EquipmentService;
	let repo: EquipmentRepository;

	beforeEach(() => {
		repo = {
			list: vi.fn(),
			getById: vi.fn(),
			getActiveByIds: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		} as unknown as EquipmentRepository;
		service = new EquipmentService(repo);
	});

	it('[P0] should list active-only when requested', async () => {
		vi.mocked(repo.list).mockResolvedValue([makeEquipment()]);
		const result = await service.list(true);
		expect(repo.list).toHaveBeenCalledWith(true);
		expect(result).toHaveLength(1);
	});

	it('[P0] should throw NotFound when equipment missing', async () => {
		vi.mocked(repo.getById).mockResolvedValue(null);
		await expect(service.getById('nope')).rejects.toThrow(NotFoundError);
	});

	it('[P0] should create equipment with normalized nullable fields', async () => {
		vi.mocked(repo.create).mockResolvedValue(makeEquipment());
		// In production the route runs the body through createEquipmentSchema first (which
		// supplies the defaults); the service just normalizes nullable optionals to null.
		await service.create({ name: 'Helm', category: 'Safety', dailyRateIdr: 50000, stock: 0, isActive: true, minRentalDays: 1, sortOrder: 0 });
		expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Helm', image: null, description: null, stock: 0 }));
	});

	it('[P0] should delete after confirming existence', async () => {
		vi.mocked(repo.getById).mockResolvedValue(makeEquipment());
		await service.delete('eq-1');
		expect(repo.delete).toHaveBeenCalledWith('eq-1');
	});
});
