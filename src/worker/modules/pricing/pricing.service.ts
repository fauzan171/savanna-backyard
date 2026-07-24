import { PricingRepository } from './pricing.repository';
import { NotFoundError } from '@/worker/core/types/errors';

export class PricingService {
	constructor(private repo: PricingRepository) {}

	async list() {
		return this.repo.list();
	}

	async getById(id: string) {
		const tier = await this.repo.getById(id);
		if (!tier) throw new NotFoundError('Pricing tier');
		return tier;
	}

	async create(data: any) {
		const now = new Date().toISOString();
		return this.repo.create({
			...data,
			description: data.description ?? null,
			features: typeof data.features === 'string' ? data.features : JSON.stringify(data.features),
			notIncluded: typeof data.notIncluded === 'string' ? data.notIncluded : JSON.stringify(data.notIncluded),
			highlighted: data.highlighted ?? false,
			icon: data.icon ?? null,
			sortOrder: data.sortOrder ?? 0,
			isActive: data.isActive ?? true,
			createdAt: now,
			updatedAt: now,
		});
	}

	async update(id: string, data: any) {
		await this.getById(id);
		const updateData: any = { ...data };
		if (data.features && typeof data.features !== 'string') {
			updateData.features = JSON.stringify(data.features);
		}
		if (data.notIncluded && typeof data.notIncluded !== 'string') {
			updateData.notIncluded = JSON.stringify(data.notIncluded);
		}
		return this.repo.update(id, updateData);
	}

	async delete(id: string) {
		await this.getById(id);
		await this.repo.delete(id);
	}

	async toggle(id: string) {
		// BUG#7: atomic toggle to avoid read-then-write race.
		const tier = await this.repo.toggleActive(id);
		if (!tier) throw new NotFoundError('Pricing tier');
		return tier;
	}
}
