import { PublicUsersRepository } from './public-users.repository';
import { JwtService } from '@/worker/core/services/jwt.service';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { decodeVehicleQr } from '@/worker/core/lib/qr';
import { PaymentGatewayFactory } from '@/worker/core/services/payment-gateway/factory';
import type { WhatsAppProvider } from '@/worker/core/services/providers';
import { ValidationError, NotFoundError } from '@/worker/core/types/errors';
import type { PhoneInitRequest, PhoneVerifyRequest, UpdateProfileRequest } from './public-users.dto';
import type { PublicUser, Booking } from '@/worker/core/database/schema';

const REF_EXPIRY_MIN = 5;
const OTP_EXPIRY_MIN = 5;
const MAX_INIT_PER_HOUR = 3;
const MAX_OTP_ATTEMPTS = 5;

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
	}> {
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
		const recent = await this.repo.countRecentVerificationByPhone(data.phone, oneHourAgo);
		if (recent >= MAX_INIT_PER_HOUR) {
			throw new ValidationError('Too many OTP requests for this number. Please try again later.');
		}

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

	/**
	 * Verify the OTP and log the user in: find-or-create the account by phone, mark it
	 * phone-verified, and mint a public-user JWT. This is the login endpoint.
	 */
	async phoneVerify(data: PhoneVerifyRequest): Promise<{
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

	async myBookingDetail(publicUserId: string, bookingId: string): Promise<PublicBookingSummary> {
		const b = await this.repo.findBookingByIdAndUser(bookingId, publicUserId);
		if (!b) throw new NotFoundError('Booking');
		return toBookingSummary(b);
	}

	/**
	 * Pay the remainder for a DP booking by creating a fresh Xendit invoice.
	 * The new invoice is for the `remainingAmount` only, with external_id =
	 * `{bookingNumber}-remainder` so the webhook can distinguish it from the
	 * original DP invoice.
	 */
	async payRemaining(
		publicUserId: string,
		bookingId: string,
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
		const b = await this.repo.findBookingByIdAndUser(bookingId, publicUserId);
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
		let paymentPageUrl = b.paymentPageUrl;
		let newInvoiceId: string | null = null;

		if (gateway.name !== 'manual') {
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

				if (result.success) {
					paymentPageUrl = result.paymentUrl ?? b.paymentPageUrl;
					newInvoiceId = result.transactionId ?? null;

					// Save the new payment link + invoice id to the booking
					await this.repo.updateBookingPaymentLink(bookingId, {
						...(paymentPageUrl ? { paymentPageUrl } : {}),
						...(newInvoiceId ? { xenditInvoiceId: newInvoiceId } : {}),
					});
				} else {
					console.error('[payRemaining] Failed to create remainder invoice:', result.error);
				}
			} catch (error) {
				console.error('[payRemaining] Exception creating remainder invoice:', error);
			}
		}

		return {
			bookingId: b.id,
			bookingNumber: b.bookingNumber,
			paymentStatus: b.paymentStatus,
			paymentPageUrl,
			xenditInvoiceId: newInvoiceId ?? b.xenditInvoiceId,
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
	async confirmPickup(publicUserId: string, bookingId: string, qrCode: string): Promise<PublicBookingSummary> {
		const b = await this.repo.findBookingByIdAndUser(bookingId, publicUserId);
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

		const updated = await this.repo.confirmPickup(bookingId);
		return toBookingSummary(updated);
	}
}
