import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicUsersService } from '@/worker/modules/public-users/public-users.service';
import { PublicUsersRepository } from '@/worker/modules/public-users/public-users.repository';
import { JwtService } from '@/worker/core/services/jwt.service';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import type { WhatsAppProvider } from '@/worker/core/services/providers';
import { ValidationError, NotFoundError } from '@/worker/core/types/errors';
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
		phone: '62812',
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
		it('[P0] should create a ref code and auto-generate the OTP in stub mode', async () => {
			vi.mocked(repo.countRecentVerificationByPhone).mockResolvedValue(0);
			vi.mocked(repo.findActiveVerificationByRef).mockResolvedValue({
				id: 'vc-1', publicUserId: null, phone: '62812', refCode: 'REFX',
				otpHash: null, type: 'phone_otp', consumed: false, attempts: 0,
				expiresAt: new Date(Date.now() + 60000).toISOString(), createdAt: '2026-01-01T00:00:00.000Z',
			});

			const result = await service.phoneInit({ phone: '62812' });

			expect(result.refCode).toHaveLength(4);
			expect(repo.createVerificationCode).toHaveBeenCalledWith(expect.objectContaining({ phone: '62812', publicUserId: null }));
			// stub mode triggers inbound -> otp hash stored + message sent
			expect(repo.updateVerification).toHaveBeenCalledWith('vc-1', expect.objectContaining({ otpHash: expect.any(String) }));
			expect(whatsapp.sendMessage).toHaveBeenCalledOnce();
			expect(sent[0]?.text).toMatch(/\d{6}/);
		});

		it('[P0] should rate-limit to 3 requests per number per hour', async () => {
			vi.mocked(repo.countRecentVerificationByPhone).mockResolvedValue(3);
			await expect(service.phoneInit({ phone: '62812' })).rejects.toThrow(ValidationError);
			expect(repo.createVerificationCode).not.toHaveBeenCalled();
		});
	});

	describe('phoneVerify (login)', () => {
		it('[P0] should find-or-create the account by phone and mint a JWT', async () => {
			const otp = '123456';
			vi.mocked(repo.findLatestVerificationByPhone).mockResolvedValue({
				id: 'vc-1', publicUserId: null, phone: '62812', refCode: 'REFX',
				otpHash: await sha256Hex(otp), type: 'phone_otp', consumed: false, attempts: 0,
				expiresAt: new Date(Date.now() + 60000).toISOString(), createdAt: '2026-01-01T00:00:00.000Z',
			});
			vi.mocked(repo.findByPhone).mockResolvedValue(null); // new user
			vi.mocked(repo.create).mockResolvedValue(makeUser());

			const result = await service.phoneVerify({ phone: '62812', code: otp });

			expect(repo.updateVerification).toHaveBeenCalledWith('vc-1', { consumed: true });
			expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ phone: '62812', phoneVerified: true }));
			expect(result.token).toBe('jwt-token');
			expect(jwt.sign).toHaveBeenCalledWith({ userId: 'user-1', type: 'public' });
		});

		it('[P0] should reuse an existing account (login) without re-creating', async () => {
			vi.mocked(repo.findLatestVerificationByPhone).mockResolvedValue({
				id: 'vc-1', publicUserId: null, phone: '62812', refCode: 'REFX',
				otpHash: await sha256Hex('123456'), type: 'phone_otp', consumed: false, attempts: 0,
				expiresAt: new Date(Date.now() + 60000).toISOString(), createdAt: '2026-01-01T00:00:00.000Z',
			});
			vi.mocked(repo.findByPhone).mockResolvedValue(makeUser());

			await service.phoneVerify({ phone: '62812', code: '123456' });

			expect(repo.create).not.toHaveBeenCalled();
		});

		it('[P0] should reject a wrong OTP and increment attempts', async () => {
			vi.mocked(repo.findLatestVerificationByPhone).mockResolvedValue({
				id: 'vc-1', publicUserId: null, phone: '62812', refCode: 'REFX',
				otpHash: await sha256Hex('123456'), type: 'phone_otp', consumed: false, attempts: 0,
				expiresAt: new Date(Date.now() + 60000).toISOString(), createdAt: '2026-01-01T00:00:00.000Z',
			});

			await expect(service.phoneVerify({ phone: '62812', code: '999999' })).rejects.toThrow(ValidationError);
			expect(repo.updateVerification).toHaveBeenCalledWith('vc-1', { attempts: 1 });
			expect(repo.create).not.toHaveBeenCalled();
		});

		it('[P0] should error when no active verification exists', async () => {
			vi.mocked(repo.findLatestVerificationByPhone).mockResolvedValue(null);
			await expect(service.phoneVerify({ phone: '62812', code: '123456' })).rejects.toThrow(ValidationError);
		});
	});

	describe('account', () => {
		it('[P0] getMe returns the account', async () => {
			vi.mocked(repo.findById).mockResolvedValue(makeUser());
			const me = await service.getMe('user-1');
			expect(me.phone).toBe('62812');
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
