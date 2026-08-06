import { PublicUsersRepository } from './public-users.repository';
import { JwtService } from '@/worker/core/services/jwt.service';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { decodeVehicleQr } from '@/worker/core/lib/qr';
import { PaymentGatewayFactory } from '@/worker/core/services/payment-gateway/factory';
import type { WhatsAppProvider } from '@/worker/core/services/providers';
import { ValidationError, NotFoundError } from '@/worker/core/types/errors';
import type { PhoneInitRequest, PhoneVerifyRequest, UpdateProfileRequest, DevLoginRequest } from './public-users.dto';
import type { PublicUser, Booking } from '@/worker/core/database/schema';

const REF_EXPIRY_MIN = 5;
const OTP_EXPIRY_MIN = 5;
const MAX_INIT_PER_HOUR = 3;
const MAX_OTP_ATTEMPTS = 5;
// ponytail: fixed dev OTP for stub mode so the OTP flow is fully testable without
// reading server logs. Only used when whatsapp provider = 'stub' (dev default).
// Prod runs on Fonnte → random OTP via genOtp(). Remove when real WA is wired.
const DEV_OTP = '123456';

export interface PublicAccountInfo {
	id: string;
	phone: string;
	name: string | null;
	email: string | null;
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
		phone: u.phone,
		name: u.name,
		email: u.email,
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

/**
 * Deterministic, non-dialable phone sentinel for developer accounts.
 * `public_users.phone` is NOT NULL + UNIQUE and is the login identity for real
 * users; dev accounts have no phone, so we derive a stable 15-digit value from
 * the email. The `000` prefix is a namespace no real E.164 number uses, keeping
 * dev rows identifiable and collision-free with real users. Same email → same
 * sentinel → same account on every login (idempotent, persisted in DB).
 */
async function devPhoneFor(email: string): Promise<string> {
	const hex = await sha256Hex(email);
	// Fold the full 256-bit hash into a base-10 number, take 12 digits, zero-pad.
	let n = 0n;
	for (let i = 0; i < hex.length; i++) {
		n = (n * 16n + BigInt(parseInt(hex[i]!, 16))) % 10n ** 12n;
	}
	return '000' + n.toString().padStart(12, '0');
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
		private whatsapp: WhatsAppProvider,
		private configRepo: ConfigRepository,
	) {}

	/**
	 * Start phone login: create a short-lived Ref code + wa.me deep link. No account
	 * needed yet — the user sends the Ref to the WhatsApp business number, the inbound
	 * webhook generates the OTP, and they verify via phoneVerify (which logs them in).
	 */
	async phoneInit(data: PhoneInitRequest): Promise<{
		refCode: string;
		waMeUrl: string;
		expiresAt: string;
		devOtp?: string;
	}> {
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
		// Per-phone throttle (protects a victim's number from spam)
		const recent = await this.repo.countRecentVerificationByPhone(data.phone, oneHourAgo);
		if (recent >= MAX_INIT_PER_HOUR) {
			throw new ValidationError('Too many OTP requests for this number. Please try again later.');
		}
		// ponytail: per-user throttle (BUG#6) needs an authenticated caller; phoneInit
		// is pre-auth (only phone known), so per-phone throttle is the only applicable
		// gate here. Apply BUG#6 once a session/publicUserId exists in the caller context.

		const refCode = genRefCode();
		const expiresAt = new Date(Date.now() + REF_EXPIRY_MIN * 60 * 1000).toISOString();
		await this.repo.createVerificationCode({
			publicUserId: null,
			phone: data.phone,
			refCode,
			otpHash: null,
			type: 'phone_otp',
			consumed: false,
			attempts: 0,
			expiresAt,
		});

		const businessNumber = (await this.configRepo.getValue('whatsapp_number')) ?? '';
		const msg = encodeURIComponent(`Savanna Bromo - Login. Ref: ${refCode}`);
		const waMeUrl = businessNumber ? `https://wa.me/${businessNumber}?text=${msg}` : '';

		// In stub/dev mode, simulate the inbound step so OTP generation still happens
		// without a real WhatsApp round-trip (keeps the flow testable end-to-end).
		// Surface the dev OTP so the client can auto-verify without server logs.
		let devOtp: string | undefined;
		if (this.whatsapp.name === 'stub') {
			const simulated = await this.handleWhatsappInbound({ message: `Ref: ${refCode}` });
			devOtp = simulated.otp;
		}

		return { refCode, waMeUrl, expiresAt, devOtp };
	}

	/**
	 * Inbound WhatsApp handler: parse the ref code, generate an OTP, store its hash,
	 * and reply the OTP via WhatsApp. Invoked by the /webhooks/whatsapp route.
	 */
	async handleWhatsappInbound(body: unknown): Promise<{ handled: boolean; otp?: string }> {
		const text = extractText(body);
		if (!text) return { handled: false };
		const ref = extractRefCode(text);
		if (!ref) return { handled: false };

		const code = await this.repo.findActiveVerificationByRef(ref);
		if (!code || !code.phone) return { handled: false };

		const isStub = this.whatsapp.name === 'stub';
		const otp = isStub ? DEV_OTP : genOtp();
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
		// Only surface the plaintext OTP in stub mode (dev). Real provider sends via WA.
		return { handled: true, otp: isStub ? otp : undefined };
	}

	/**
	 * Verify the OTP and log the user in: find-or-create the account by phone, mark it
	 * phone-verified, and mint a public-user JWT. This is the login endpoint.
	 */
	async phoneVerify(data: PhoneVerifyRequest): Promise<{
		user: PublicAccountInfo;
		token: string;
	}> {
		// ponytail: C4 user-scoping needs a known publicUserId; verify is keyed by
		// phone+OTP and the code row is bound to the phone at init, so plain lookup
		// is sufficient. Re-add the user filter when a session user is in context.
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

		// Find-or-create the account by phone (this is the login)
		let user = await this.repo.findByPhone(data.phone);
		if (!user) {
			user = await this.repo.create({
				phone: data.phone,
				name: null,
				email: null,
				phoneVerified: true,
				deviceFingerprint: null,
				avatarUrl: null,
				isActive: true,
			});
		} else if (!user.phoneVerified) {
			user = await this.repo.update(user.id, { phoneVerified: true });
		}

		const { token } = await this.jwtService.sign({ userId: user.id, type: 'public' });
		return { user: toAccountInfo(user), token };
	}

	/**
	 * Developer login by email (no OTP). Gated by an allowlist passed from the
	 * route (sourced from DEVELOPER_ALLOWLIST env). Find-or-creates the account
	 * keyed by email, using a deterministic sentinel phone to satisfy the
	 * NOT NULL + UNIQUE phone constraint. Issues the same public-user JWT as the
	 * OTP flow, so every downstream path (middleware, /me, bookings) works unchanged.
	 */
	async devLogin(data: DevLoginRequest, allowlist: string[]): Promise<{
		user: PublicAccountInfo;
		token: string;
	}> {
		const email = data.email.trim().toLowerCase();
		// ponytail: fail-closed allowlist; empty/missing allowlist = no dev login at all.
		if (!allowlist.includes(email)) {
			throw new ValidationError('Email tidak terdaftar untuk login developer.');
		}

		let user = await this.repo.findByEmail(email);
		if (!user) {
			const phone = await devPhoneFor(email);
			user = await this.repo.create({
				phone,
				name: email.split('@')[0] || 'Developer',
				email,
				phoneVerified: true,
				deviceFingerprint: null,
				avatarUrl: null,
				isActive: true,
			});
		} else if (!user.phoneVerified) {
			user = await this.repo.update(user.id, { phoneVerified: true });
		}

		const { token } = await this.jwtService.sign({ userId: user.id, type: 'public' });
		return { user: toAccountInfo(user), token };
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
		const user = await this.repo.findById(publicUserId);

		// Primary: bookings directly linked via publicUserId
		const linked = await this.repo.listBookingsByPublicUser(publicUserId);

		// Fallback: bookings where customer phone matches but publicUserId is still NULL
		// (legacy bookings created before account linking was implemented)
		let phoneMatched: Booking[] = [];
		if (user?.phone) {
			phoneMatched = await this.repo.listBookingsByPhone(user.phone);
			// Auto-link any orphaned phone-matched bookings so they appear via the primary
			// path next time (one-time migration per user)
			if (phoneMatched.length > 0) {
				await this.repo.linkBookingsByPhone(publicUserId, user.phone);
			}
		}

		// Union (deduplicate by ID)
		const seen = new Set<string>();
		const all: Booking[] = [];
		for (const b of [...linked, ...phoneMatched]) {
			if (!seen.has(b.id)) {
				seen.add(b.id);
				all.push(b);
			}
		}

		return all.map(toBookingSummary);
	}

	async myBookingDetail(publicUserId: string, bookingIdOrNumber: string): Promise<PublicBookingSummary> {
		const b = await this.findBookingByIdOrNumberAndUser(publicUserId, bookingIdOrNumber);
		if (!b) throw new NotFoundError('Booking');
		return toBookingSummary(b);
	}

	/**
	 * Helper: try UUID lookup first, then fall back to bookingNumber.
	 * Makes endpoints accept both formats for better DX.
	 */
	private async findBookingByIdOrNumberAndUser(
		publicUserId: string,
		bookingIdOrNumber: string,
	): Promise<Booking | null> {
		let b = await this.repo.findBookingByIdAndUser(bookingIdOrNumber, publicUserId);
		if (!b) {
			b = await this.repo.findBookingByNumberAndUser(bookingIdOrNumber, publicUserId);
		}
		return b;
	}

	/**
	 * Pay the remainder for a DP booking by creating a fresh Xendit invoice.
	 * The new invoice is for the `remainingAmount` only, with external_id =
	 * `{bookingNumber}-remainder` so the webhook can distinguish it from the
	 * original DP invoice.
	 */
	async payRemaining(
		publicUserId: string,
		bookingIdOrNumber: string,
		gatewayConfig: { vendor: string; config: Record<string, string> },
	): Promise<{
		bookingId: string;
		bookingNumber: string;
		paymentStatus: string | null;
		paymentPageUrl: string | null;
		xenditInvoiceId: string | null;
		totalAmount: number;
		remainingAmount: number | null;
	}> {
		const b = await this.findBookingByIdOrNumberAndUser(publicUserId, bookingIdOrNumber);
		if (!b) throw new NotFoundError('Booking');

		const isFullyPaid = b.paymentStatus === 'settlement' || b.fullyPaidAt !== null;
		if (isFullyPaid) {
			throw new ValidationError('Booking is already fully paid');
		}

		const remaining = (b as Record<string, unknown>).remainingAmount as number ?? 0;
		if (remaining <= 0) {
			throw new ValidationError('No remaining amount to pay');
		}

		// Create a NEW invoice for the remainder amount
		const gateway = PaymentGatewayFactory.create(gatewayConfig.vendor as 'xendit' | 'ifortepay' | 'midtrans' | 'manual', gatewayConfig.config);
		let paymentPageUrl: string | null = null;
		let newInvoiceId: string | null = null;

		if (gateway.name === 'manual') {
			throw new ValidationError('Online payment gateway is not available');
		}

		try {
				const result = await gateway.createPayment({
					amount: remaining,
					currency: 'IDR',
					method: 'Gateway',
					bookingId: `${b.bookingNumber}-remainder`,
					customerEmail: (b as Record<string, unknown>).customerEmail as string ?? undefined,
					customerPhone: (b as Record<string, unknown>).customerPhone as string ?? undefined,
					description: `Pelunasan ${b.bookingNumber} — sisa Rp ${remaining.toLocaleString('id-ID')}`,
				});

				if (result.success && result.paymentUrl) {
					paymentPageUrl = result.paymentUrl;
					newInvoiceId = result.transactionId ?? null;

					// Save the new payment link + invoice id to the booking
					await this.repo.updateBookingPaymentLink(b.id, {
						...(paymentPageUrl ? { paymentPageUrl } : {}),
						...(newInvoiceId ? { xenditInvoiceId: newInvoiceId } : {}),
					});
				} else {
					throw new Error(result.error?.message ?? 'Payment gateway did not return a payment URL');
			}
		} catch (error) {
			console.error('[payRemaining] Failed to create remainder invoice:', error);
			throw new ValidationError('Gagal membuat link pelunasan. Silakan coba lagi.');
		}

		return {
			bookingId: b.id,
			bookingNumber: b.bookingNumber,
			paymentStatus: b.paymentStatus,
			paymentPageUrl,
			xenditInvoiceId: newInvoiceId,
			totalAmount: b.totalAmount,
			remainingAmount: remaining,
		};
	}

	/**
	 * Confirm pickup by scanning the vehicle QR code. Soft-confirm: sets
	 * pickupConfirmed + status=Active. Does NOT record startKm or flip the vehicle
	 * to Rented — the admin's physical handover (pickup checklist + startRental)
	 * still owns that. Kept here to avoid coupling the public-users service into
	 * BookingsService.
	 */
	async confirmPickup(publicUserId: string, bookingIdOrNumber: string, qrCode: string): Promise<PublicBookingSummary> {
		const b = await this.findBookingByIdOrNumberAndUser(publicUserId, bookingIdOrNumber);
		if (!b) throw new NotFoundError('Booking');

		const scannedVehicleId = decodeVehicleQr(qrCode);
		if (!scannedVehicleId) throw new ValidationError('QR code tidak valid');
		if (b.vehicleId !== scannedVehicleId) {
			throw new ValidationError('QR code tidak sesuai dengan kendaraan pada booking ini');
		}
		if (b.status !== 'Confirmed') {
			throw new ValidationError(`Status booking "${b.status}" tidak memungkinkan konfirmasi pickup`);
		}
		if (b.pickupConfirmed) {
			throw new ValidationError('Pickup sudah dikonfirmasi sebelumnya');
		}

		const paymentReady =
			b.paymentStatus === 'settlement' ||
			b.fullyPaidAt !== null;
		if (!paymentReady) {
			throw new ValidationError('Pembayaran belum lunas. Selesaikan pembayaran penuh sebelum pickup.');
		}

		const updated = await this.repo.confirmPickup(b.id);
		return toBookingSummary(updated);
	}
}
