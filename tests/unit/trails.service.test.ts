import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrailsService } from '@/worker/modules/trails/trails.service';
import { TrailsRepository } from '@/worker/modules/trails/trails.repository';
import { createTrailSchema } from '@/worker/modules/trails/trails.dto';

describe('TrailsService (TRAIL-02 / TRAIL-03)', () => {
	let svc: TrailsService;
	let repo: TrailsRepository;

	beforeEach(() => {
		repo = {
			getById: vi.fn(),
			list: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		} as unknown as TrailsRepository;
		svc = new TrailsService(repo);
	});

	it('rejects duplicate id with ConflictError (TRAIL-03)', async () => {
		vi.mocked(repo.getById).mockResolvedValue({ id: 'sea-of-sand' } as any);
		await expect(svc.create({ id: 'sea-of-sand', name: 'X' })).rejects.toThrow('Trail ID sudah terdaftar');
		expect(repo.create).not.toHaveBeenCalled();
	});

	it('creates when id is free', async () => {
		vi.mocked(repo.getById).mockResolvedValue(null);
		vi.mocked(repo.create).mockResolvedValue({ id: 'new' } as any);
		await expect(svc.create({ id: 'new', name: 'X' })).resolves.toBeDefined();
	});
});

describe('createTrailSchema gallery JSON (TRAIL-02)', () => {
	const base: any = { id: 't1', name: 'Trail' };

	it('rejects invalid JSON', () => {
		expect(createTrailSchema.safeParse({ ...base, blogGallery: 'bukan json' }).success).toBe(false);
		expect(createTrailSchema.safeParse({ ...base, blogGallery: '{not valid json' }).success).toBe(false);
	});

	it('accepts valid JSON array, empty, or null', () => {
		expect(createTrailSchema.safeParse({ ...base, blogGallery: '["a.jpg","b.jpg"]' }).success).toBe(true);
		expect(createTrailSchema.safeParse({ ...base, blogGallery: '' }).success).toBe(true);
		expect(createTrailSchema.safeParse({ ...base, blogGallery: null }).success).toBe(true);
	});

	it('rejects valid JSON that is not an array', () => {
		expect(createTrailSchema.safeParse({ ...base, blogGallery: '{"x":1}' }).success).toBe(false);
	});
});
