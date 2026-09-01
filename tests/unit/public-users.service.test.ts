import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicUsersService } from '@/worker/modules/public-users/public-users.service';
import { PublicUsersRepository } from '@/worker/modules/public-users/public-users.repository';
import { JwtService } from '@/worker/core/services/jwt.service';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import type { WhatsAppProvider } from '@/worker/core/services/providers';
import { ValidationError, NotFoundError } from '@/worker/core/types/errors';
import type { PublicUser } from '@/worker/core/database/schema';

const TEST_PHONE = '628123456789';

// Mirror the service's sha256 to build matching otpHash fixtures
async function sha256Hex(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const h = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, '0')).join('');
}

function makeUser(overrides: Partial<PublicUser> = {}): PublicUser {
	return {
		id: 'user-1',
		phone: TEST_PHONE,
		name: null,
		email: null,
		phoneVerified: true,
		deviceFingerprint: null,
		avatarUrl: null,
		isActive: true,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...overrides,
	};
}

describe('PublicUsersService (phone-only login)', () => {
	let service: PublicUsersService;
	let repo: PublicUsersRepository;
	let jwt: JwtService;
	let whatsapp: WhatsAppProvider;
	let configRepo: ConfigRepository;
	let sent: { to: string; text: string }[];

	beforeEach(() => {
		repo = {
			findByPhone: vi.fn(),
			findByEmail: vi.fn(),
			findById: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			setPhoneVerified: vi.fn(),
			createVerificationCode: vi.fn(),
			findActiveVerificationByRef: vi.fn(),
			findLatestVerificationByPhone: vi.fn(),
			countRecentVerificationByPhone: vi.fn(),
			updateVerification: vi.fn(),
			createNotification: vi.fn(),
			attachNotificationsToPublicUser: vi.fn(),
			listBookingsByPublicUser: vi.fn(),
			findBookingByIdAndUser: vi.fn(),
		} as unknown as PublicUsersRepository;

		jwt = { sign: vi.fn().mockResolvedValue({ token: 'jwt-token', jti: 'jti-1', exp: 1 }) } as unknown as JwtService;

		sent = [];
		whatsapp = {
			name: 'stub',
			sendMessage: vi.fn(async (to: string, text: string) => {
				sent.push({ to, text });
				return { success: true };
			}),
		} as unknown as WhatsAppProvider;

		configRepo = { getValue: vi.fn().mockResolvedValue(null), getNumber: vi.fn().mockResolvedValue(30) } as unknown as ConfigRepository;

		service = new PublicUsersService(repo, jwt, whatsapp, configRepo);
	});

	describe('phoneInit', () => {
		it('[P0] should create a ref code and return the OTP in web mode', async () => {
			vi.mocked(repo.countRecentVerificationByPhone).mockResolvedValue(0);

			const result = await service.phoneInit({ phone: '+62 812-3456-789' });

			expect(result.refCode).toHaveLength(4);
			expect(result.waMeUrl).toBe('');
			expect(result.webOtp).toMatch(/^\d{6}$/);
			expect(repo.createVerificationCode).toHaveBeenCalledWith(expect.objectContaining({
				phone: TEST_PHONE,
				publicUserId: null,
				otpCode: result.webOtp,
				otpHash: expect.any(String),
				deliveryChannel: 'web',
				status: 'otp_sent',
			}));
			expect(repo.createNotification).toHaveBeenCalledWith(expect.objectContaining({
				phone: TEST_PHONE,
				type: 'otp',
			}));
			expect(whatsapp.sendMessage).not.toHaveBeenCalled();
		});

		it('[P0] should rate-limit to 3 requests per number per hour', async () => {
			vi.mocked(repo.countRecentVerificationByPhone).mockResolvedValue(3);
			await expect(service.phoneInit({ phone: TEST_PHONE })).rejects.toThrow(ValidationError);
			expect(repo.createVerificationCode).not.toHaveBeenCalled();
		});
	});

	describe('phoneVerify (login)', () => {
		it('[P0] should find-or-create the account by phone and mint a JWT', async () => {
			const otp = '123456';
			vi.mocked(repo.findLatestVerificationByPhone).mockResolvedValue({
				id: 'vc-1', publicUserId: null, phone: TEST_PHONE, refCode: 'REFX',
				otpCode: otp, otpHash: await sha256Hex(otp), deliveryChannel: 'web', status: 'otp_sent', type: 'phone_otp', consumed: false, attempts: 0,
				expiresAt: new Date(Date.now() + 60000).toISOString(), createdAt: '2026-01-01T00:00:00.000Z',
			});
			vi.mocked(repo.findByPhone).mockResolvedValue(null); // new user
			vi.mocked(repo.create).mockResolvedValue(makeUser());

			const result = await service.phoneVerify({ phone: TEST_PHONE, code: otp });

			expect(repo.updateVerification).toHaveBeenCalledWith('vc-1', { consumed: true, status: 'verified' });
			expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ phone: TEST_PHONE, phoneVerified: true }));
			expect(repo.attachNotificationsToPublicUser).toHaveBeenCalledWith(TEST_PHONE, 'user-1');
			expect(result.token).toBe('jwt-token');
			expect(jwt.sign).toHaveBeenCalledWith({ userId: 'user-1', type: 'public' });
		});

		it('[P0] should reuse an existing account (login) without re-creating', async () => {
			vi.mocked(repo.findLatestVerificationByPhone).mockResolvedValue({
				id: 'vc-1', publicUserId: null, phone: TEST_PHONE, refCode: 'REFX',
				otpCode: '123456', otpHash: await sha256Hex('123456'), deliveryChannel: 'web', status: 'otp_sent', type: 'phone_otp', consumed: false, attempts: 0,
				expiresAt: new Date(Date.now() + 60000).toISOString(), createdAt: '2026-01-01T00:00:00.000Z',
			});
			vi.mocked(repo.findByPhone).mockResolvedValue(makeUser());

			await service.phoneVerify({ phone: TEST_PHONE, code: '123456' });

			expect(repo.create).not.toHaveBeenCalled();
		});

		it('[P0] should reject a wrong OTP and increment attempts', async () => {
			vi.mocked(repo.findLatestVerificationByPhone).mockResolvedValue({
				id: 'vc-1', publicUserId: null, phone: TEST_PHONE, refCode: 'REFX',
				otpCode: '123456', otpHash: await sha256Hex('123456'), deliveryChannel: 'web', status: 'otp_sent', type: 'phone_otp', consumed: false, attempts: 0,
				expiresAt: new Date(Date.now() + 60000).toISOString(), createdAt: '2026-01-01T00:00:00.000Z',
			});

			await expect(service.phoneVerify({ phone: TEST_PHONE, code: '999999' })).rejects.toThrow(ValidationError);
			expect(repo.updateVerification).toHaveBeenCalledWith('vc-1', { attempts: 1 });
			expect(repo.create).not.toHaveBeenCalled();
		});

		it('[P0] should error when no active verification exists', async () => {
			vi.mocked(repo.findLatestVerificationByPhone).mockResolvedValue(null);
			await expect(service.phoneVerify({ phone: TEST_PHONE, code: '123456' })).rejects.toThrow(ValidationError);
		});
	});

	describe('account', () => {
		it('[P0] getMe returns the account', async () => {
			vi.mocked(repo.findById).mockResolvedValue(makeUser());
			const me = await service.getMe('user-1');
			expect(me.phone).toBe(TEST_PHONE);
		});

		it('[P0] getMe throws NotFound when missing', async () => {
			vi.mocked(repo.findById).mockResolvedValue(null);
			await expect(service.getMe('user-1')).rejects.toThrow(NotFoundError);
		});

		it('[P0] updateProfile updates only provided fields', async () => {
			vi.mocked(repo.update).mockResolvedValue(makeUser({ name: 'Budi' }));
			const res = await service.updateProfile('user-1', { name: 'Budi' });
			expect(repo.update).toHaveBeenCalledWith('user-1', { name: 'Budi' });
			expect(res.name).toBe('Budi');
		});
	});

	describe('devLogin (email allowlist)', () => {
		it('[P0] should reject emails not in the allowlist (fail-closed)', async () => {
			await expect(service.devLogin({ email: 'intruder@evil.com' }, ['dev@savanna.com'])).rejects.toThrow(ValidationError);
			expect(repo.findByEmail).not.toHaveBeenCalled();
			expect(repo.create).not.toHaveBeenCalled();
		});

		it('[P0] should reject everything when allowlist is empty', async () => {
			await expect(service.devLogin({ email: 'dev@savanna.com' }, [])).rejects.toThrow(ValidationError);
		});

		it('[P0] should find-or-create a dev account with a stable sentinel phone and mint a JWT', async () => {
			vi.mocked(repo.findByEmail).mockResolvedValue(null);
			vi.mocked(repo.create).mockImplementation(async (data) => makeUser({ ...data, id: 'dev-user-id' }) as PublicUser);

			const result = await service.devLogin({ email: 'Dev@Savanna.com' }, ['dev@savanna.com']);

			// email normalized to lowercase before allowlist check + storage
			expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
				email: 'dev@savanna.com',
				phone: expect.stringMatching(/^000\d{12}$/),
				phoneVerified: true,
				isActive: true,
			}));
			expect(result.token).toBe('jwt-token');
			expect(jwt.sign).toHaveBeenCalledWith({ userId: 'dev-user-id', type: 'public' });
		});

		it('[P0] should reuse an existing dev account (same email → same account, no re-create)', async () => {
			vi.mocked(repo.findByEmail).mockResolvedValue(makeUser({ id: 'dev-1', email: 'dev@savanna.com' }));

			await service.devLogin({ email: 'dev@savanna.com' }, ['dev@savanna.com']);

			expect(repo.create).not.toHaveBeenCalled();
			expect(jwt.sign).toHaveBeenCalledWith({ userId: 'dev-1', type: 'public' });
		});

		it('[P0] should produce the same sentinel phone for the same email across calls (deterministic)', async () => {
			vi.mocked(repo.findByEmail).mockResolvedValue(null);
			let captured = '';
			vi.mocked(repo.create).mockImplementation(async (data) => {
				captured = data.phone!;
				return makeUser({ ...data }) as PublicUser;
			});
			await service.devLogin({ email: 'dev@savanna.com' }, ['dev@savanna.com']);
			const first = captured;

			vi.mocked(repo.findByEmail).mockResolvedValue(null);
			await service.devLogin({ email: 'dev@savanna.com' }, ['dev@savanna.com']);
			expect(captured).toBe(first);
			expect(first).toMatch(/^000\d{12}$/);
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
				id: 'vc-1', publicUserId: null, phone: '62812', refCode: 'A3F9',
				otpHash: null, type: 'phone_otp', consumed: false, attempts: 0,
				expiresAt: new Date(Date.now() + 60000).toISOString(), createdAt: '2026-01-01T00:00:00.000Z',
			});
			const res = await service.handleWhatsappInbound({ message: 'Ref: A3F9' });
			expect(res.handled).toBe(true);
			expect(repo.updateVerification).toHaveBeenCalledWith('vc-1', expect.objectContaining({ otpHash: expect.any(String) }));
			expect(whatsapp.sendMessage).toHaveBeenCalledOnce();
		});
	});
});
