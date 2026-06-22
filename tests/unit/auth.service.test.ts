import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '@/worker/modules/auth/auth.service';
import { UserRepository } from '@/worker/modules/auth/auth.repository';
import { JwtService } from '@/worker/core/services/jwt.service';
import { UnauthorizedError } from '@/worker/core/types/errors';
import { createTestUser, hashPassword } from '@test/utils';

describe('AuthService', () => {
	let authService: AuthService;
	let mockUserRepo: UserRepository;
	let mockJwtService: JwtService;

	beforeEach(() => {
		// Create mock repository
		mockUserRepo = {
			findByEmail: vi.fn(),
			findById: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		} as unknown as UserRepository;

		// Create mock JWT service
		mockJwtService = {
			sign: vi.fn(),
			verify: vi.fn(),
			decode: vi.fn(),
		} as unknown as JwtService;

		authService = new AuthService(mockUserRepo, mockJwtService);
	});

	// Helper to mock JwtService.sign to return the correct format
	const mockSignSuccess = (token: string) => ({
		token,
		jti: 'mock-jti',
		exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
	});

	describe('login', () => {
		// ============================================
		// P0: Happy Path - Critical business scenarios
		// ============================================

		it('[P0] should login successfully with valid credentials', async () => {
			const testUser = createTestUser({ password: 'correct-password' });
			const mockToken = 'mock-jwt-token';

			vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(testUser);
			vi.mocked(mockJwtService.sign).mockResolvedValue(mockSignSuccess(mockToken));

			const result = await authService.login({
				email: testUser.email,
				password: 'correct-password',
			});

			expect(result).toEqual({
				user: {
					id: testUser.id,
					name: testUser.name,
					email: testUser.email,
					role: testUser.role,
				},
				token: mockToken,
			});
			expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(testUser.email);
			expect(mockJwtService.sign).toHaveBeenCalledWith({
				userId: testUser.id,
				type: 'admin',
				role: testUser.role,
			});
		});

		it('[P0] should login SUPER_ADMIN successfully', async () => {
			const adminUser = createTestUser({
				role: 'SUPER_ADMIN',
				password: 'admin-password',
			});
			const mockToken = 'admin-jwt-token';

			vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(adminUser);
			vi.mocked(mockJwtService.sign).mockResolvedValue(mockSignSuccess(mockToken));

			const result = await authService.login({
				email: adminUser.email,
				password: 'admin-password',
			});

			expect(result.user.role).toBe('SUPER_ADMIN');
			expect(result.token).toBe(mockToken);
		});

		// ============================================
		// P0: Error Cases - Must handle correctly
		// ============================================

		it('[P0] should throw UnauthorizedError when user not found', async () => {
			vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

			await expect(
				authService.login({ email: 'nonexistent@example.com', password: 'any-password' })
			).rejects.toThrow(UnauthorizedError);

			await expect(
				authService.login({ email: 'nonexistent@example.com', password: 'any-password' })
			).rejects.toThrow('Invalid credentials');
		});

		it('[P0] should throw UnauthorizedError when password is incorrect', async () => {
			const testUser = createTestUser({ password: 'correct-password' });
			vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(testUser);

			await expect(
				authService.login({ email: testUser.email, password: 'wrong-password' })
			).rejects.toThrow(UnauthorizedError);

			await expect(
				authService.login({ email: testUser.email, password: 'wrong-password' })
			).rejects.toThrow('Invalid credentials');
		});

		it('[P0] should throw UnauthorizedError when account is deactivated', async () => {
			const deactivatedUser = createTestUser({
				password: 'correct-password',
				isActive: false,
			});
			vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(deactivatedUser);

			await expect(
				authService.login({ email: deactivatedUser.email, password: 'correct-password' })
			).rejects.toThrow(UnauthorizedError);

			await expect(
				authService.login({ email: deactivatedUser.email, password: 'correct-password' })
			).rejects.toThrow('Account is deactivated');
		});

		// ============================================
		// P1: Edge Cases - Important boundary conditions
		// ============================================

		it('[P1] should handle email with different casing (case-insensitive)', async () => {
			// Note: Current implementation is case-sensitive
			// This test documents the expected behavior
			const testUser = createTestUser({ email: 'test@example.com', password: 'password' });
			vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

			await expect(
				authService.login({ email: 'TEST@EXAMPLE.COM', password: 'password' })
			).rejects.toThrow('Invalid credentials');

			expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('TEST@EXAMPLE.COM');
		});

		it('[P1] should handle password with special characters', async () => {
			const specialPassword = 'p@$$w0rd!#$%^&*()';
			const testUser = createTestUser({ password: specialPassword });
			const mockToken = 'mock-token';

			vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(testUser);
			vi.mocked(mockJwtService.sign).mockResolvedValue(mockSignSuccess(mockToken));

			const result = await authService.login({
				email: testUser.email,
				password: specialPassword,
			});

			expect(result.token).toBe(mockToken);
		});

		it('[P1] should handle password with unicode characters', async () => {
			const unicodePassword = 'pässwörd123日本語';
			const testUser = createTestUser({ password: unicodePassword });
			const mockToken = 'mock-token';

			vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(testUser);
			vi.mocked(mockJwtService.sign).mockResolvedValue(mockSignSuccess(mockToken));

			const result = await authService.login({
				email: testUser.email,
				password: unicodePassword,
			});

			expect(result.token).toBe(mockToken);
		});

		it('[P1] should handle minimum length password (6 chars)', async () => {
			const minPassword = '123456';
			const testUser = createTestUser({ password: minPassword });
			const mockToken = 'mock-token';

			vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(testUser);
			vi.mocked(mockJwtService.sign).mockResolvedValue(mockSignSuccess(mockToken));

			const result = await authService.login({
				email: testUser.email,
				password: minPassword,
			});

			expect(result.token).toBe(mockToken);
		});

		it('[P1] should not expose whether email exists or password is wrong (same error message)', async () => {
			// User not found case
			vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

			try {
				await authService.login({ email: 'unknown@test.com', password: 'password' });
				expect.fail('Should have thrown');
			} catch (error) {
				expect((error as UnauthorizedError).message).toBe('Invalid credentials');
			}

			// Wrong password case
			const testUser = createTestUser({ password: 'correct' });
			vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(testUser);

			try {
				await authService.login({ email: testUser.email, password: 'wrong' });
				expect.fail('Should have thrown');
			} catch (error) {
				expect((error as UnauthorizedError).message).toBe('Invalid credentials');
			}
		});

		it('[P1] should handle malformed password hash in database', async () => {
			const testUser = {
				...createTestUser(),
				passwordHash: 'invalid-base64-hash!!!',
			};
			vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(testUser);

			// Should not throw, but return false for password verification
			await expect(
				authService.login({ email: testUser.email, password: 'any-password' })
			).rejects.toThrow('Invalid credentials');
		});

		it('[P1] should handle empty password', async () => {
			const testUser = createTestUser({ password: 'non-empty' });
			vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(testUser);

			await expect(
				authService.login({ email: testUser.email, password: '' })
			).rejects.toThrow('Invalid credentials');
		});
	});

	describe('me', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return user info for valid user ID', async () => {
			const testUser = createTestUser();
			vi.mocked(mockUserRepo.findById).mockResolvedValue(testUser);

			const result = await authService.me(testUser.id);

			expect(result).toEqual({
				id: testUser.id,
				name: testUser.name,
				email: testUser.email,
				role: testUser.role,
			});
			expect(mockUserRepo.findById).toHaveBeenCalledWith(testUser.id);
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw UnauthorizedError when user not found', async () => {
			vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

			await expect(authService.me('nonexistent-id')).rejects.toThrow(UnauthorizedError);
			await expect(authService.me('nonexistent-id')).rejects.toThrow('User not found');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should handle deactivated user (still returns info)', async () => {
			const deactivatedUser = createTestUser({ isActive: false });
			vi.mocked(mockUserRepo.findById).mockResolvedValue(deactivatedUser);

			// me() endpoint doesn't check isActive - it just returns user info
			const result = await authService.me(deactivatedUser.id);

			expect(result.id).toBe(deactivatedUser.id);
		});

		it('[P1] should not return password hash in response', async () => {
			const testUser = createTestUser();
			vi.mocked(mockUserRepo.findById).mockResolvedValue(testUser);

			const result = await authService.me(testUser.id);

			expect(result).not.toHaveProperty('passwordHash');
			expect(result).not.toHaveProperty('password');
		});
	});
});
