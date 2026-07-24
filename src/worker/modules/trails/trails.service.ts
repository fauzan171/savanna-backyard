import { TrailsRepository } from './trails.repository';
import { ConflictError, NotFoundError } from '@/worker/core/types/errors';
import type { CreateTrailRequest, UpdateTrailRequest } from './trails.dto';

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

	async create(data: CreateTrailRequest) {
		// TRAIL-03: reject duplicate trail names
		const existing = await this.repo.findByName(data.name);
		if (existing) {
			throw new ConflictError('Nama trail sudah terdaftar');
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

	async update(id: string, data: UpdateTrailRequest) {
		const existing = await this.getById(id);

		// TRAIL-03: reject duplicate names when renaming
		if (data.name && data.name !== existing.name) {
			const conflict = await this.repo.findByName(data.name);
			if (conflict) {
				throw new ConflictError('Nama trail sudah terdaftar');
			}
		}

		return this.repo.update(id, data);
	}

	async delete(id: string) {
		await this.getById(id);
		await this.repo.delete(id);
	}

	async toggle(id: string) {
		// BUG#7: atomic toggle to avoid read-then-write race.
		const trail = await this.repo.toggleActive(id);
		if (!trail) throw new NotFoundError('Trail');
		return trail;
	}
}
