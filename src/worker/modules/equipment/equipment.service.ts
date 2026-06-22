import { EquipmentRepository } from './equipment.repository';
import { NotFoundError } from '@/worker/core/types/errors';
import type { CreateEquipmentRequest, UpdateEquipmentRequest } from './equipment.dto';

export class EquipmentService {
	constructor(private repo: EquipmentRepository) {}

	async list(activeOnly = false) {
		return this.repo.list(activeOnly);
	}

	async getById(id: string) {
		const item = await this.repo.getById(id);
		if (!item) throw new NotFoundError('Equipment');
		return item;
	}

	async create(data: CreateEquipmentRequest) {
		return this.repo.create({
			name: data.name,
			category: data.category,
			description: data.description ?? null,
			dailyRateIdr: data.dailyRateIdr,
			image: data.image ?? null,
			stock: data.stock,
			isActive: data.isActive,
			minRentalDays: data.minRentalDays,
			sortOrder: data.sortOrder,
		});
	}

	async update(id: string, data: UpdateEquipmentRequest) {
		await this.getById(id);
		return this.repo.update(id, data);
	}

	async delete(id: string) {
		await this.getById(id);
		await this.repo.delete(id);
	}
}
