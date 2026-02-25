import crypto from 'crypto';

/**
 * Hash password using PBKDF2 (for test fixtures)
 * Matches the algorithm used in auth.service.ts
 */
export function hashPassword(password: string): string {
	const salt = crypto.randomBytes(16);
	const iterations = 100000;
	const keylen = 32; // 256 bits

	const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keylen, 'sha256');

	// Combine salt + derived key, then base64 encode
	const combined = Buffer.concat([salt, derivedKey]);
	return combined.toString('base64');
}

/**
 * Create a test user with hashed password
 */
export function createTestUser(overrides: Partial<{
	id: string;
	name: string;
	email: string;
	password: string;
	role: 'SUPER_ADMIN' | 'STAFF';
	isActive: boolean;
}> = {}) {
	const password = overrides.password ?? 'password123';
	return {
		id: overrides.id ?? 'test-user-id',
		name: overrides.name ?? 'Test User',
		email: overrides.email ?? 'test@example.com',
		passwordHash: hashPassword(password),
		role: overrides.role ?? 'STAFF' as const,
		isActive: overrides.isActive ?? true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
}
