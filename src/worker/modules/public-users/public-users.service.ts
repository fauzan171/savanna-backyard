import { PublicUsersRepository } from './public-users.repository';
import { JwtService } from '@/worker/core/services/jwt.service';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import type { GoogleOAuthProvider, WhatsAppProvider } from '@/worker/core/services/providers';
import { ValidationError, UnauthorizedError, NotFoundError } from '@/worker/core/types/errors';
import type { GoogleLoginRequest, PhoneInitRequest, PhoneVerifyRequest, UpdateProfileRequest } from './public-users.dto';
import type { PublicUser, Booking } from '@/worker/core/database/schema';

const REF_EXPIRY_MIN = 5;
const OTP_EXPIRY_MIN = 5;
const MAX_INIT_PER_HOUR = 3;
const MAX_OTP_ATTEMPTS = 5;

export interface PublicAccountInfo {
	id: string;
	email: string;
	name: string;
	phone: string | null;
	phoneVerified: boolean;
	avatarUrl: string | null;
}

export interface PublicBookingSummary {
	id: string;
	bookingNumber: string;
	vehicleId: string;
	startDate: string;
	endDate: string;
	status: string;
	paymentStatus: string | null;
	paymentType: string | null;
	totalAmount: number;
	dpAmount: number | null;
	remainingAmount: number | null;
	pickupConfirmed: boolean | null;
	createdAt: string;
}

function toAccountInfo(u: PublicUser): PublicAccountInfo {
	return {
		id: u.id,
		email: u.email,
		name: u.name,
		phone: u.phone,
		phoneVerified: u.phoneVerified,
		avatarUrl: u.avatarUrl,
	};
}

function toBookingSummary(b: Booking): PublicBookingSummary {
	return {
		id: b.id,
		bookingNumber: b.bookingNumber,
		vehicleId: b.vehicleId,
		startDate: b.startDate,
		endDate: b.endDate,
		status: b.status,
		paymentStatus: b.paymentStatus,
		paymentType: b.paymentType,
		totalAmount: b.totalAmount,
		dpAmount: b.dpAmount,
		remainingAmount: b.remainingAmount,
		pickupConfirmed: b.pickupConfirmed,
		createdAt: b.createdAt,
	};
}

// Ref code: 4 chars, no ambiguous chars (0/O/1/I)
function genRefCode(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	const buf = new Uint8Array(4);
	crypto.getRandomValues(buf);
	let s = '';
	for (let i = 0; i < 4; i++) s += chars[buf[i]! % chars.length]!;
	return s;
}

function genOtp(): string {
	const buf = new Uint8Array(6);
	crypto.getRandomValues(buf);
	return Array.from(buf, (b) => (b % 10).toString()).join('');
}

async function sha256Hex(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const h = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Extract the message text from a provider-specific inbound payload. */
function extractText(body: unknown): string | null {
	if (!body || typeof body !== 'object') return null;
	const b = body as Record<string, unknown>;
	const raw = b.message ?? b.text ?? b.body ?? b.Body ?? b.content;
	if (typeof raw === 'string') return raw;
	return null;
}

/** Extract the 4-char ref code from an inbound message (expects "Ref: XXXX"). */
function extractRefCode(text: string): string | null {
	const afterRef = text.match(/ref[:\s]*([A-HJ-NP-Z2-9]{4})/i);
	if (afterRef) return afterRef[1]!.toUpperCase();
	const standalone = text.match(/\b([A-HJ-NP-Z2-9]{4})\b/);
	return standalone ? standalone[1]!.toUpperCase() : null;
}

export class PublicUsersService {
	constructor(
		private repo: PublicUsersRepository,
		private jwtService: JwtService,
		private google: GoogleOAuthProvider,
		private whatsapp: WhatsAppProvider,
		private configRepo: ConfigRepository,
	) {}

	/** Google OAuth login: verify id_token, upsert user, mint a public-user JWT. */
	async googleLogin(data: GoogleLoginRequest): Promise<{
		token: string;
		user: PublicAccountInfo;
		requiresPhoneVerification: boolean;
	}> {
		const info = await this.google.verifyIdToken(data.idToken);
		let user = await this.repo.findByGoogleId(info.googleId);
		if (!user) {
			user = await this.repo.create({
				googleId: info.googleId,
				email: info.email,
				name: info.name,
				avatarUrl: info.avatarUrl,
				phone: null,
				phoneVerified: false,
				deviceFingerprint: data.deviceFingerprint ?? null,
				isActive: true,
			});
		}
		if (!user.isActive) {
			throw new UnauthorizedError('Account is deactivated');
		}
		const { token } = await this.jwtService.sign({ userId: user.id, type: 'public' });
		return {
			token,
			user: toAccountInfo(user),
			requiresPhoneVerification: !user.phoneVerified,
		};
	}

	/** Start phone verification: create a short-lived ref code + wa.me deep link. */
	async phoneInit(publicUserId: string, data: PhoneInitRequest): Promise<{
		refCode: string;
		waMeUrl: string;
		expiresAt: string;
	}> {
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
		const recent = await this.repo.countRecentVerificationByPhone(data.phone, oneHourAgo);
		if (recent >= MAX_INIT_PER_HOUR) {
			throw new ValidationError('Too many OTP requests for this number. Please try again later.');
		}

		const refCode = genRefCode();
		const expiresAt = new Date(Date.now() + REF_EXPIRY_MIN * 60 * 1000).toISOString();
		await this.repo.createVerificationCode({
			publicUserId,
			phone: data.phone,
			refCode,
			otpHash: null,
			type: 'phone_otp',
			consumed: false,
			attempts: 0,
			expiresAt,
		});

		const businessNumber = (await this.configRepo.getValue('whatsapp_number')) ?? '';
		const msg = encodeURIComponent(`Savanna Bromo - Verifikasi nomor. Ref: ${refCode}`);
		const waMeUrl = businessNumber ? `https://wa.me/${businessNumber}?text=${msg}` : '';

		// In stub/dev mode, simulate the inbound step so OTP generation still happens
		// without a real WhatsApp round-trip (keeps the flow testable end-to-end).
		if (this.whatsapp.name === 'stub') {
			await this.handleWhatsappInbound({ message: `Ref: ${refCode}` });
		}

		return { refCode, waMeUrl, expiresAt };
	}

	/**
	 * Inbound WhatsApp handler: parse the ref code, generate an OTP, store its hash,
	 * and reply the OTP via WhatsApp. Invoked by the /webhooks/whatsapp route.
	 */
	async handleWhatsappInbound(body: unknown): Promise<{ handled: boolean }> {
		const text = extractText(body);
		if (!text) return { handled: false };
		const ref = extractRefCode(text);
		if (!ref) return { handled: false };

		const code = await this.repo.findActiveVerificationByRef(ref);
		if (!code || !code.phone) return { handled: false };

		const otp = genOtp();
		const otpHash = await sha256Hex(otp);
		const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000).toISOString();
		await this.repo.updateVerification(code.id, { otpHash, expiresAt: otpExpiresAt });

		const result = await this.whatsapp.sendMessage(
			code.phone,
			`Kode OTP Savanna Bromo Anda: ${otp}. Berlaku ${OTP_EXPIRY_MIN} menit. Jangan bagikan kode ini ke siapapun.`,
		);
		if (!result.success) {
			console.error('[phone-otp] WhatsApp send failed:', result.error);
		}
		return { handled: true };
	}

	/** Verify the OTP entered by the user; on success consume the code + verify the phone. */
	async phoneVerify(publicUserId: string, data: PhoneVerifyRequest): Promise<{
		verified: boolean;
		user: PublicAccountInfo;
		token: string;
	}> {
		const code = await this.repo.findLatestVerificationByPhone(data.phone);
		if (!code) {
			throw new ValidationError('No active verification for this number. Please request a new OTP.');
		}
		if (!code.otpHash) {
			throw new ValidationError('OTP not yet generated. Send the Ref code to our WhatsApp number first.');
		}
		if (code.attempts >= MAX_OTP_ATTEMPTS) {
			throw new ValidationError('Too many wrong attempts. Please request a new OTP.');
		}

		const hash = await sha256Hex(data.code);
		if (hash !== code.otpHash) {
			await this.repo.updateVerification(code.id, { attempts: code.attempts + 1 });
			throw new ValidationError('Invalid OTP code.');
		}

		await this.repo.updateVerification(code.id, { consumed: true });
		await this.repo.setPhoneVerified(publicUserId, data.phone);

		const user = await this.repo.findById(publicUserId);
		if (!user) throw new NotFoundError('Account');

		const { token } = await this.jwtService.sign({ userId: user.id, type: 'public' });
		return { verified: true, user: toAccountInfo(user), token };
	}

	async getMe(publicUserId: string): Promise<PublicAccountInfo> {
		const user = await this.repo.findById(publicUserId);
		if (!user) throw new NotFoundError('Account');
		return toAccountInfo(user);
	}

	async updateProfile(publicUserId: string, data: UpdateProfileRequest): Promise<PublicAccountInfo> {
		const update: Partial<PublicUser> = {};
		if (data.name !== undefined) update.name = data.name;
		if (data.avatarUrl !== undefined) update.avatarUrl = data.avatarUrl;
		const user = await this.repo.update(publicUserId, update);
		return toAccountInfo(user);
	}

	async myBookings(publicUserId: string): Promise<PublicBookingSummary[]> {
		const rows = await this.repo.listBookingsByPublicUser(publicUserId);
		return rows.map(toBookingSummary);
	}

	async myBookingDetail(publicUserId: string, bookingId: string): Promise<PublicBookingSummary> {
		const b = await this.repo.findBookingByIdAndUser(bookingId, publicUserId);
		if (!b) throw new NotFoundError('Booking');
		return toBookingSummary(b);
	}

	/**
	 * Re-open the booking's payment to pay the remainder (DP -> full).
	 * The Xendit invoice was created with allow_partial for the full amount, so the
	 * customer reopens the SAME invoice_url to pay more. No new invoice is created
	 * unless the original expired (follow-up: create a fresh invoice for the remainder).
	 */
	async payRemaining(publicUserId: string, bookingId: string): Promise<{
		bookingId: string;
		bookingNumber: string;
		paymentStatus: string | null;
		paymentPageUrl: string | null;
		xenditInvoiceId: string | null;
		totalAmount: number;
		remainingAmount: number | null;
	}> {
		const b = await this.repo.findBookingByIdAndUser(bookingId, publicUserId);
		if (!b) throw new NotFoundError('Booking');

		const isFullyPaid = b.paymentStatus === 'settlement' || b.fullyPaidAt !== null;
		if (isFullyPaid) {
			throw new ValidationError('Booking is already fully paid');
		}

		return {
			bookingId: b.id,
			bookingNumber: b.bookingNumber,
			paymentStatus: b.paymentStatus,
			paymentPageUrl: b.paymentPageUrl,
			xenditInvoiceId: b.xenditInvoiceId,
			totalAmount: b.totalAmount,
			remainingAmount: b.remainingAmount,
		};
	}
}
