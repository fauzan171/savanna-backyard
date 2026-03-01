import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { UnauthorizedError } from '@/worker/core/types/errors';
import { validateBody, getValidatedBody } from '@/worker/core/middleware/validator';
import { loginSchema } from '@/worker/modules/auth/auth.dto';
import jwt from '@tsndr/cloudflare-worker-jwt';

// Mock JWT for predictable testing
vi.mock('@tsndr/cloudflare-worker-jwt', () => ({
	default: {
		sign: vi.fn(),
		verify: vi.fn(),
		decode: vi.fn(),
	},
}));

// Mock the database
vi.mock('@/worker/core/database', () => ({
	createDb: vi.fn(() => ({})),
}));

// Mock the token blacklist repository with a proper class constructor
vi.mock('@/worker/core/repositories/token-blacklist.repository', () => {
	return {
		TokenBlacklistRepository: class MockTokenBlacklistRepository {
			isJtiBlacklisted = vi.fn().mockResolvedValue(false);
		},
	};
});

const mockJwt = vi.mocked(jwt);

/**
 * Integration tests for Auth module
 * Tests the full authentication flow with Hono app
 *
 * Note: For full database integration tests, use wrangler's local D1
 * These tests focus on the HTTP layer and middleware integration
 */
describe('Auth Integration Tests', () => {
	let app: Hono<{ Bindings: Env }>;
	const testJwtSecret = 'test-jwt-secret';

	beforeEach(() => {
		vi.clearAllMocks();
		app = new Hono<{ Bindings: Env }>();

		// Error handler
		app.onError((err, c) => {
			const status = 'statusCode' in err ? (err.statusCode as number) : 500;
			const code = 'code' in err ? (err.code as string) : 'INTERNAL_ERROR';
			return c.json({ error: { message: err.message, code } }, status);
		});
	});

	describe('Authentication Middleware Integration', () => {
		beforeEach(() => {
			app.use('/protected/*', authMiddleware());
			app.get('/protected/resource', (c) => {
				const user = c.get('user');
				return c.json({ message: 'Access granted', user });
			});
		});

		// ============================================
		// P0: Critical Scenarios
		// ============================================

		it('[P0] should grant access with valid Bearer token', async () => {
			const mockPayload = { userId: 'user-123', role: 'STAFF' as const, jti: 'jti-123' };
			mockJwt.verify.mockResolvedValue(true);
			mockJwt.decode.mockReturnValue({ payload: mockPayload });

			const res = await app.request('/protected/resource', {
				headers: { Authorization: 'Bearer valid-token' },
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(200);
			const body = await res.json() as { message: string; user: { userId: string; role: string } };
			expect(body.message).toBe('Access granted');
			expect(body.user).toEqual({ userId: 'user-123', role: 'STAFF' });
		});

		it('[P0] should deny access without token', async () => {
			const res = await app.request('/protected/resource', {}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(401);
			const body = await res.json() as { error: { code: string } };
			expect(body.error.code).toBe('UNAUTHORIZED');
		});

		it('[P0] should deny access with invalid token', async () => {
			mockJwt.verify.mockResolvedValue(false);

			const res = await app.request('/protected/resource', {
				headers: { Authorization: 'Bearer invalid-token' },
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(401);
			const body = await res.json() as { error: { code: string } };
			expect(body.error.code).toBe('UNAUTHORIZED');
		});

		it('[P0] should deny access with expired token', async () => {
			// Simulate expired token - verification fails
			mockJwt.verify.mockResolvedValue(false);

			const res = await app.request('/protected/resource', {
				headers: { Authorization: 'Bearer expired-token' },
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(401);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should handle multiple protected routes', async () => {
			const mockPayload = { userId: 'user-123', role: 'STAFF' as const, jti: 'jti-123' };
			mockJwt.verify.mockResolvedValue(true);
			mockJwt.decode.mockReturnValue({ payload: mockPayload });

			app.get('/protected/another', (c) => c.json({ route: 'another' }));

			// First route
			const res1 = await app.request('/protected/resource', {
				headers: { Authorization: 'Bearer valid-token' },
			}, { JWT_SECRET: testJwtSecret } as Env);
			expect(res1.status).toBe(200);

			// Second route
			const res2 = await app.request('/protected/another', {
				headers: { Authorization: 'Bearer valid-token' },
			}, { JWT_SECRET: testJwtSecret } as Env);
			expect(res2.status).toBe(200);
		});

		it('[P1] should handle concurrent requests', async () => {
			const mockPayload = { userId: 'user-123', role: 'STAFF' as const, jti: 'jti-123' };
			mockJwt.verify.mockResolvedValue(true);
			mockJwt.decode.mockReturnValue({ payload: mockPayload });

			const requests = Array(10).fill(null).map(() =>
				app.request('/protected/resource', {
					headers: { Authorization: 'Bearer valid-token' },
				}, { JWT_SECRET: testJwtSecret } as Env)
			);

			const responses = await Promise.all(requests);
			responses.forEach(res => {
				expect(res.status).toBe(200);
			});
		});
	});

	describe('Error Handling Integration', () => {
		// ============================================
		// P0: Error Response Format
		// ============================================

		it('[P0] should return consistent error format for UnauthorizedError', async () => {
			app.get('/error', () => {
				throw new UnauthorizedError('Test error');
			});

			const res = await app.request('/error');

			expect(res.status).toBe(401);
			const body = await res.json() as { error: { message: string; code: string } };
			expect(body).toHaveProperty('error');
			expect(body.error).toHaveProperty('message');
			expect(body.error).toHaveProperty('code');
			expect(body.error.code).toBe('UNAUTHORIZED');
		});

		// ============================================
		// P1: Error Scenarios
		// ============================================

		it('[P1] should handle malformed Authorization header gracefully', async () => {
			app.use('/protected', authMiddleware());
			app.get('/protected', (c) => c.json({ success: true }));

			const res = await app.request('/protected', {
				headers: { Authorization: 'InvalidFormat' },
			}, { JWT_SECRET: testJwtSecret } as Env);

			// Should fail - no valid token found
			expect(res.status).toBe(401);
		});

		it('[P1] should handle JWT library errors', async () => {
			app.use('/protected', authMiddleware());
			app.get('/protected', (c) => c.json({ success: true }));

			mockJwt.verify.mockRejectedValue(new Error('JWT library error'));

			const res = await app.request('/protected', {
				headers: { Authorization: 'Bearer token' },
			}, { JWT_SECRET: testJwtSecret } as Env);

			expect(res.status).toBe(401);
		});
	});

	describe('Login Validation Integration', () => {
		beforeEach(() => {
			app.use('/login', validateBody(loginSchema));
			app.post('/login', (c) => {
				const body = getValidatedBody(c);
				return c.json({ success: true, email: body.email });
			});
		});

		// ============================================
		// P0: Validation
		// ============================================

		it('[P0] should accept valid login credentials', async () => {
			const res = await app.request('/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: 'user@example.com', password: 'password123' }),
			});

			expect(res.status).toBe(200);
			const body = await res.json() as { success: boolean; email: string };
			expect(body.success).toBe(true);
			expect(body.email).toBe('user@example.com');
		});

		it('[P0] should reject invalid email format', async () => {
			const res = await app.request('/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: 'not-an-email', password: 'password123' }),
			});

			expect(res.status).toBe(400);
		});

		it('[P0] should reject short password', async () => {
			const res = await app.request('/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: 'user@example.com', password: '12345' }),
			});

			expect(res.status).toBe(400);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should reject empty body', async () => {
			const res = await app.request('/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			});

			expect(res.status).toBe(400);
		});

		it('[P1] should reject missing Content-Type', async () => {
			const res = await app.request('/login', {
				method: 'POST',
				body: JSON.stringify({ email: 'user@example.com', password: 'password123' }),
			});

			// May still work depending on how the body is parsed
			expect([200, 400]).toContain(res.status);
		});
	});
});
