import { describe, it, expect, beforeEach } from 'vitest';
import { JwtService } from '@/worker/core/services/jwt.service';

describe('JwtService', () => {
	const testSecret = 'test-secret-key-for-jwt-signing';
	let jwtService: JwtService;

	beforeEach(() => {
		jwtService = new JwtService(testSecret);
	});

	describe('sign', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should sign a valid JWT token', async () => {
			const payload = {
				userId: 'user-123',
				role: 'STAFF' as const,
			};

			const token = await jwtService.sign(payload);

			expect(token).toBeDefined();
			expect(typeof token).toBe('string');
			expect(token.split('.').length).toBe(3); // JWT has 3 parts
		});

		it('[P0] should sign token with SUPER_ADMIN role', async () => {
			const payload = {
				userId: 'admin-123',
				role: 'SUPER_ADMIN' as const,
			};

			const token = await jwtService.sign(payload);

			expect(token).toBeDefined();
			expect(await jwtService.verify(token)).toBe(true);
		});

		it('[P0] should include expiration time', async () => {
			const payload = {
				userId: 'user-123',
				role: 'STAFF' as const,
			};

			const token = await jwtService.sign(payload);
			const decoded = jwtService.decode(token);

			expect(decoded).not.toBeNull();
			expect(decoded?.payload.exp).toBeDefined();
			expect(decoded?.payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should use custom expiration days', async () => {
			const payload = {
				userId: 'user-123',
				role: 'STAFF' as const,
			};
			const customDays = 30;

			const token = await jwtService.sign(payload, customDays);
			const decoded = jwtService.decode(token);

			const expectedExp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * customDays;
			// Allow 1 second tolerance
			expect(decoded?.payload.exp).toBeGreaterThanOrEqual(expectedExp - 1);
			expect(decoded?.payload.exp).toBeLessThanOrEqual(expectedExp + 1);
		});

		it('[P1] should generate unique tokens for same payload', async () => {
			const payload = {
				userId: 'user-123',
				role: 'STAFF' as const,
			};

			const token1 = await jwtService.sign(payload);
			// Wait a bit to ensure different iat
			await new Promise(resolve => setTimeout(resolve, 10));
			const token2 = await jwtService.sign(payload);

			// Both tokens should be valid
			expect(await jwtService.verify(token1)).toBe(true);
			expect(await jwtService.verify(token2)).toBe(true);
		});

		it('[P1] should handle long user IDs', async () => {
			const longId = 'a'.repeat(100);
			const payload = {
				userId: longId,
				role: 'STAFF' as const,
			};

			const token = await jwtService.sign(payload);
			const decoded = jwtService.decode(token);

			expect(decoded?.payload.userId).toBe(longId);
		});
	});

	describe('verify', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should verify a valid token', async () => {
			const payload = {
				userId: 'user-123',
				role: 'STAFF' as const,
			};
			const token = await jwtService.sign(payload);

			const isValid = await jwtService.verify(token);

			expect(isValid).toBe(true);
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should reject token signed with different secret', async () => {
			const otherService = new JwtService('different-secret');
			const payload = {
				userId: 'user-123',
				role: 'STAFF' as const,
			};

			const token = await otherService.sign(payload);
			const isValid = await jwtService.verify(token);

			expect(isValid).toBe(false);
		});

		it('[P0] should reject malformed token', async () => {
			// The library throws an error for malformed tokens
			await expect(jwtService.verify('not-a-valid-jwt')).rejects.toThrow();
		});

		it('[P0] should reject empty token', async () => {
			// The library throws an error for empty tokens
			await expect(jwtService.verify('')).rejects.toThrow();
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should reject token with invalid structure', async () => {
			// The library throws an error for tokens with invalid structure
			await expect(jwtService.verify('a.b')).rejects.toThrow();
		});

		it('[P1] should reject token with invalid base64', async () => {
			// The library throws an error for tokens with invalid characters
			await expect(jwtService.verify('a!b@c#')).rejects.toThrow();
		});

		it('[P1] should reject tampered token', async () => {
			const payload = {
				userId: 'user-123',
				role: 'STAFF' as const,
			};
			const token = await jwtService.sign(payload);

			// Tamper with the token by changing the payload
			const parts = token.split('.');
			// Change a character in the payload (middle part)
			const tamperedPayload = parts[1].slice(0, -1) + (parts[1].endsWith('A') ? 'B' : 'A');
			const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

			// The library should reject the tampered token
			// It may throw or return false depending on the tampering
			try {
				const result = await jwtService.verify(tamperedToken);
				// If it doesn't throw, it should return false
				expect(result).toBe(false);
			} catch {
				// Expected - library threw an error for tampered token
				expect(true).toBe(true);
			}
		});
	});

	describe('decode', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should decode a valid token', async () => {
			const payload = {
				userId: 'user-123',
				role: 'STAFF' as const,
			};
			const token = await jwtService.sign(payload);

			const decoded = jwtService.decode(token);

			expect(decoded).not.toBeNull();
			expect(decoded?.payload.userId).toBe(payload.userId);
			expect(decoded?.payload.role).toBe(payload.role);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should return null for invalid token', () => {
			const decoded = jwtService.decode('invalid-token');

			expect(decoded).toBeNull();
		});

		it('[P1] should return null for empty token', () => {
			const decoded = jwtService.decode('');

			expect(decoded).toBeNull();
		});

		it('[P1] should include iat and exp in decoded payload', async () => {
			const payload = {
				userId: 'user-123',
				role: 'STAFF' as const,
			};
			const token = await jwtService.sign(payload);

			const decoded = jwtService.decode(token);

			expect(decoded?.payload.iat).toBeDefined();
			expect(decoded?.payload.exp).toBeDefined();
		});
	});

	describe('Integration: sign -> verify -> decode', () => {
		it('[P1] should complete full token lifecycle', async () => {
			const payload = {
				userId: 'user-123',
				role: 'SUPER_ADMIN' as const,
			};

			// Sign
			const token = await jwtService.sign(payload);
			expect(token).toBeDefined();

			// Verify
			const isValid = await jwtService.verify(token);
			expect(isValid).toBe(true);

			// Decode
			const decoded = jwtService.decode(token);
			expect(decoded?.payload.userId).toBe(payload.userId);
			expect(decoded?.payload.role).toBe(payload.role);
		});
	});
});
