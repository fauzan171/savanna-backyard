import { vi } from 'vitest';
import type { Database } from '@/worker/core/database';

// Create a mock database
export function createMockDb(): Database {
	return {
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		limit: vi.fn().mockResolvedValue([]),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([]),
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
	} as unknown as Database;
}

// Create a mock D1Database
export function createMockD1Database(): D1Database {
	return {
		prepare: vi.fn().mockReturnValue({
			bind: vi.fn().mockReturnThis(),
			first: vi.fn().mockResolvedValue(null),
			all: vi.fn().mockResolvedValue({ results: [] }),
			run: vi.fn().mockResolvedValue({ results: [] }),
		}),
		dump: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
		batch: vi.fn().mockResolvedValue([]),
		exec: vi.fn().mockResolvedValue({ count: 0, duration: 0 }),
	} as unknown as D1Database;
}
