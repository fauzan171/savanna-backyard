import { afterAll, vi } from 'vitest';
import { webcrypto } from 'crypto';

// Polyfill Web Crypto API for Node.js environment
if (!globalThis.crypto) {
	Object.defineProperty(globalThis, 'crypto', {
		value: webcrypto,
		writable: false,
		configurable: true,
	});
}

// Mock D1Database for unit tests
const mockD1Database = {
	prepare: vi.fn(),
	dump: vi.fn(),
	batch: vi.fn(),
	exec: vi.fn(),
};

// Make it available globally for tests
vi.stubGlobal('D1Database', mockD1Database);

// Clean up after each test
afterAll(() => {
	vi.clearAllMocks();
});
