import { TrailsRepository } from './trails.repository';
import { NotFoundError, ConflictError } from '@/worker/core/types/errors';

export class TrailsService {
	constructor(private repo: TrailsRepository) {}

	async list() {
		return this.repo.list();
	}

	async getById(id: string) {
		const trail = await this.repo.getById(id);
		if (!trail) throw new NotFoundError('Trail');
		return trail;
	}

	async create(data: any) {
		const existing = await this.repo.getById(data.id);
		if (existing) {
			throw new ConflictError('Trail ID sudah terdaftar');
		}

		const now = new Date().toISOString();
		return this.repo.create({
			...data,
			description: data.description ?? null,
			terrain: data.terrain ?? null,
			elevation: data.elevation ?? null,
			difficulty: data.difficulty ?? null,
			recommended: data.recommended ?? null,
			image: data.image ?? null,
			mapImage: data.mapImage ?? null,
			blogOverview: data.blogOverview ?? null,
			blogTips: data.blogTips ?? null,
			blogGallery: data.blogGallery ?? null,
			gpxUrl: data.gpxUrl ?? null,
			estimatedDuration: data.estimatedDuration ?? null,
			distance: data.distance ?? null,
			bestTime: data.bestTime ?? null,
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
		const trail = await this.getById(id);
		return this.repo.update(id, { isActive: !trail.isActive });
	}
}
