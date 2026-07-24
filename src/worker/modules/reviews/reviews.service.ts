import { ReviewsRepository } from './reviews.repository';
import { NotFoundError } from '@/worker/core/types/errors';

export class ReviewsService {
	constructor(private repo: ReviewsRepository) {}

	async list() {
		return this.repo.list();
	}

	async getById(id: string) {
		const review = await this.repo.getById(id);
		if (!review) throw new NotFoundError('Review');
		return review;
	}

	async create(data: any) {
		const now = new Date().toISOString();
		return this.repo.create({
			...data,
			location: data.location ?? null,
			avatar: data.avatar ?? null,
			isPublished: data.isPublished ?? false,
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
		const review = await this.repo.togglePublished(id);
		if (!review) throw new NotFoundError('Review');
		return review;
	}
}
