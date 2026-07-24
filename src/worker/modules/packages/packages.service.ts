import { PackagesRepository } from './packages.repository';
import { NotFoundError } from '@/worker/core/types/errors';

export class PackagesService {
	constructor(private repo: PackagesRepository) {}

	async list() {
		return this.repo.list();
	}

	async getById(id: string) {
		const pkg = await this.repo.getById(id);
		if (!pkg) throw new NotFoundError('Package');
		return pkg;
	}

	async create(data: any) {
		const now = new Date().toISOString();
		return this.repo.create({
			...data,
			tagline: data.tagline ?? null,
			description: data.description ?? null,
			image: data.image ?? null,
			duration: data.duration ?? null,
			distance: data.distance ?? null,
			groupSize: data.groupSize ?? null,
			trailId: data.trailId ?? null,
			sortOrder: data.sortOrder ?? 0,
			isActive: data.isActive ?? true,
			createdAt: now,
			updatedAt: now,
		});
	}

	async update(id: string, data: any) {
		await this.getById(id);
		return this.repo.update(id, data);
	}

	async delete(id: string) {
		await this.getById(id);
		await this.repo.delete(id);
	}

	async toggle(id: string) {
		// BUG#7: atomic toggle to avoid read-then-write race.
		const pkg = await this.repo.toggleActive(id);
		if (!pkg) throw new NotFoundError('Package');
		return pkg;
	}
}
