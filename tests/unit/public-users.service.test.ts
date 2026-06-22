import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicUsersService } from '@/worker/modules/public-users/public-users.service';
import { PublicUsersRepository } from '@/worker/modules/public-users/public-users.repository';
import { JwtService } from '@/worker/core/services/jwt.service';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import type { GoogleOAuthProvider, WhatsAppProvider } from '@/worker/core/services/providers';
import { UnauthorizedError, ValidationError, NotFoundError } from '@/worker/core/types/errors';
import type { PublicUser } from '@/worker/core/database/schema';

// Mirror the service's sha256 to build matching otpHash fixtures
async function sha256Hex(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const h = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, '0')).join('');
}

function makeUser(overrides: Partial<PublicUser> = {}): PublicUser {
	return {
		id: 'user-1',
		googleId: 'g-123',
		email: 'budi@example.com',
		name: 'Budi',
		phone: null,
		phoneVerified: false,
		deviceFingerprint: null,
		avatarUrl: null,
		isActive: true,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...overrides,
	};
}

describe('PublicUsersService', () => {
	let service: PublicUsersService;
	let repo: PublicUsersRepository;
	let jwt: JwtService;
	let google: GoogleOAuthProvider;
	let whatsapp: WhatsAppProvider;
	let configRepo: ConfigRepository;
	let sent: { to: string; text: string }[];

	beforeEach(() => {
		repo = {
			findByGoogleId: vi.fn(),
			findById: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			setPhoneVerified: vi.fn(),
			createVerificationCode: vi.fn(),
			findActiveVerificationByRef: vi.fn(),
			findLatestVerificationByPhone: vi.fn(),
			countRecentVerificationByPhone: vi.fn(),
			updateVerification: vi.fn(),
			listBookingsByPublicUser: vi.fn(),
			findBookingByIdAndUser: vi.fn(),
		} as unknown as PublicUsersRepository;

		jwt = { sign: vi.fn().mockResolvedValue({ token: 'jwt-token', jti: 'jti-1', exp: 1 }) } as unknown as JwtService;

		google = { verifyIdToken: vi.fn() } as unknown as GoogleOAuthProvider;

		sent = [];
		whatsapp = {
			name: 'stub',
			sendMessage: vi.fn(async (to: string, text: string) => {
				sent.push({ to, text });
				return { success: true };
			}),
		} as unknown as WhatsAppProvider;

		configRepo = { getValue: vi.fn().mockResolvedValue(null) } as unknown as ConfigRepository;

		service = new PublicUsersService(repo, jwt, google, whatsapp, configRepo);
	});

	describe('googleLogin', () => {
		it('[P0] should create a new user and mint a public JWT with requiresPhoneVerification=true', async () => {
			vi.mocked(google.verifyIdToken).mockResolvedValue({
				googleId: 'g-123',
				email: 'budi@example.com',
				name: 'Budi',
				avatarUrl: null,
			});
			vi.mocked(repo.findByGoogleId).mockResolvedValue(null);
			vi.mocked(repo.create).mockResolvedValue(makeUser());

			const result = await service.googleLogin({ idToken: 'tok' });

			expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ googleId: 'g-123', email: 'budi@example.com', phoneVerified: false }));
			expect(result.token).toBe('jwt-token');
			expect(result.requiresPhoneVerification).toBe(true);
			expect(jwt.sign).toHaveBeenCalledWith({ userId: 'user-1', type: 'public' });
		});

		it('[P0] should reuse an existing google account and not re-create', async () => {
			vi.mocked(google.verifyIdToken).mockResolvedValue({ googleId: 'g-123', email: 'budi@example.com', name: 'Budi', avatarUrl: null });
			vi.mocked(repo.findByGoogleId).mockResolvedValue(makeUser({ phoneVerified: true, phone: '6281' }));

			const result = await service.googleLogin({ idToken: 'tok' });

			expect(repo.create).not.toHaveBeenCalled();
			expect(result.requiresPhoneVerification).toBe(false);
		});

		it('[P0] should reject a deactivated account', async () => {
			vi.mocked(google.verifyIdToken).mockResolvedValue({ googleId: 'g-123', email: 'budi@example.com', name: 'Budi', avatarUrl: null });
			vi.mocked(repo.findByGoogleId).mockResolvedValue(makeUser({ isActive: false }));

			await expect(service.googleLogin({ idToken: 'tok' })).rejects.toThrow(UnauthorizedError);
		});
	});

	describe('phoneInit', () => {
		it('[P0] should create a ref code and auto-generate the OTP in stub mode', async () => {
			vi.mocked(repo.countRecentVerificationByPhone).mockResolvedValue(0);
			vi.mocked(repo.findActiveVerificationByRef).mockResolvedValue({
				id: 'vc-1',
				publicUserId: 'user-1',
				phone: '62812',
				refCode: 'REFX',
				otpHash: null,
				type: 'phone_otp',
				consumed: false,
				attempts: 0,
				expiresAt: new Date(Date.now() + 60000).toISOString(),
				createdAt: '2026-01-01T00:00:00.000Z',
			});

			const result = await service.phoneInit('user-1', { phone: '62812' });

			expect(result.refCode).toHaveLength(4);
			expect(repo.createVerificationCode).toHaveBeenCalledOnce();
			// stub mode triggers the inbound step -> otp hash stored + message sent
			expect(repo.updateVerification).toHaveBeenCalledWith('vc-1', expect.objectContaining({ otpHash: expect.any(String) }));
			expect(whatsapp.sendMessage).toHaveBeenCalledOnce();
			expect(sent[0]?.text).toMatch(/\d{6}/);
		});

		it('[P0] should rate-limit to 3 requests per number per hour', async () => {
			vi.mocked(repo.countRecentVerificationByPhone).mockResolvedValue(3);
			await expect(service.phoneInit('user-1', { phone: '62812' })).rejects.toThrow(ValidationError);
			expect(repo.createVerificationCode).not.toHaveBeenCalled();
		});
	});

	describe('phoneVerify', () => {
		it('[P0] should verify a correct OTP and mark the phone verified', async () => {
			const otp = '123456';
			const otpHash = await sha256Hex(otp);
			vi.mocked(repo.findLatestVerificationByPhone).mockResolvedValue({
				id: 'vc-1',
				publicUserId: 'user-1',
				phone: '62812',
				refCode: 'REFX',
				otpHash,
				type: 'phone_otp',
				consumed: false,
				attempts: 0,
				expiresAt: new Date(Date.now() + 60000).toISOString(),
				createdAt: '2026-01-01T00:00:00.000Z',
			});
			vi.mocked(repo.findById).mockResolvedValue(makeUser({ phoneVerified: true, phone: '62812' }));

			const result = await service.phoneVerify('user-1', { phone: '62812', code: otp });

			expect(result.verified).toBe(true);
			expect(repo.updateVerification).toHaveBeenCalledWith('vc-1', { consumed: true });
			expect(repo.setPhoneVerified).toHaveBeenCalledWith('user-1', '62812');
		});

		it('[P0] should reject a wrong OTP and increment attempts', async () => {
			vi.mocked(repo.findLatestVerificationByPhone).mockResolvedValue({
				id: 'vc-1',
				publicUserId: 'user-1',
				phone: '62812',
				refCode: 'REFX',
				otpHash: await sha256Hex('123456'),
				type: 'phone_otp',
				consumed: false,
				attempts: 0,
				expiresAt: new Date(Date.now() + 60000).toISOString(),
				createdAt: '2026-01-01T00:00:00.000Z',
			});

			await expect(service.phoneVerify('user-1', { phone: '62812', code: '999999' })).rejects.toThrow(ValidationError);
			expect(repo.updateVerification).toHaveBeenCalledWith('vc-1', { attempts: 1 });
			expect(repo.setPhoneVerified).not.toHaveBeenCalled();
		});

		it('[P0] should error when OTP has not been generated yet', async () => {
			vi.mocked(repo.findLatestVerificationByPhone).mockResolvedValue({
				id: 'vc-1',
				publicUserId: 'user-1',
				phone: '62812',
				refCode: 'REFX',
				otpHash: null,
				type: 'phone_otp',
				consumed: false,
				attempts: 0,
				expiresAt: new Date(Date.now() + 60000).toISOString(),
				createdAt: '2026-01-01T00:00:00.000Z',
			});
			await expect(service.phoneVerify('user-1', { phone: '62812', code: '123456' })).rejects.toThrow(ValidationError);
		});

		it('[P0] should error when no active verification exists', async () => {
			vi.mocked(repo.findLatestVerificationByPhone).mockResolvedValue(null);
			await expect(service.phoneVerify('user-1', { phone: '62812', code: '123456' })).rejects.toThrow(ValidationError);
		});
	});

	describe('account', () => {
		it('[P0] getMe returns the account', async () => {
			vi.mocked(repo.findById).mockResolvedValue(makeUser());
			const me = await service.getMe('user-1');
			expect(me.email).toBe('budi@example.com');
		});

		it('[P0] getMe throws NotFound when missing', async () => {
			vi.mocked(repo.findById).mockResolvedValue(null);
			await expect(service.getMe('user-1')).rejects.toThrow(NotFoundError);
		});

		it('[P0] updateProfile updates only provided fields', async () => {
			vi.mocked(repo.update).mockResolvedValue(makeUser({ name: 'Budi Baru' }));
			const res = await service.updateProfile('user-1', { name: 'Budi Baru' });
			expect(repo.update).toHaveBeenCalledWith('user-1', { name: 'Budi Baru' });
			expect(res.name).toBe('Budi Baru');
		});
	});

	describe('handleWhatsappInbound', () => {
		it('[P0] should ignore messages without a ref code', async () => {
			const res = await service.handleWhatsappInbound({ message: 'halo' });
			expect(res.handled).toBe(false);
			expect(repo.updateVerification).not.toHaveBeenCalled();
		});

		it('[P0] should generate + reply OTP for a valid ref', async () => {
			vi.mocked(repo.findActiveVerificationByRef).mockResolvedValue({
				id: 'vc-1',
				publicUserId: 'user-1',
				phone: '62812',
				refCode: 'A3F9',
				otpHash: null,
				type: 'phone_otp',
				consumed: false,
				attempts: 0,
				expiresAt: new Date(Date.now() + 60000).toISOString(),
				createdAt: '2026-01-01T00:00:00.000Z',
			});
			const res = await service.handleWhatsappInbound({ message: 'Ref: A3F9' });
			expect(res.handled).toBe(true);
			expect(repo.updateVerification).toHaveBeenCalledWith('vc-1', expect.objectContaining({ otpHash: expect.any(String) }));
			expect(whatsapp.sendMessage).toHaveBeenCalledOnce();
		});
	});
});
