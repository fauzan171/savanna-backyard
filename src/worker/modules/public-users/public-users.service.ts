import { PublicUsersRepository } from './public-users.repository';
import { JwtService } from '@/worker/core/services/jwt.service';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { decodeVehicleQr } from '@/worker/core/lib/qr';
import { PaymentGatewayFactory } from '@/worker/core/services/payment-gateway/factory';
import type { WhatsAppProvider } from '@/worker/core/services/providers';
import { CustomerNotificationService } from '@/worker/core/services/customer-notification.service';
import { ValidationError, NotFoundError } from '@/worker/core/types/errors';
import type { PhoneInitRequest, PhoneVerifyRequest, UpdateProfileRequest, DevLoginRequest, CustomerInspectionRequest } from './public-users.dto';
import type { PublicUser, Booking, PublicUserNotification } from '@/worker/core/database/schema';

const OTP_EXPIRY_MIN = 5;
const MAX_INIT_PER_HOUR = 3;
const MAX_OTP_ATTEMPTS = 5;
// ponytail: fixed dev OTP for stub mode so the OTP flow is fully testable without
// reading server logs. Only used when whatsapp provider = 'stub' (dev default).
// Prod runs on Fonnte → random OTP via genOtp(). Remove when real WA is wired.
const DEV_OTP = '123456';
type OtpDeliveryChannel = 'web' | 'whatsapp';

export interface PublicAccountInfo {
	id: string;
	phone: string;
	name: string | null;
	email: string | null;
	phoneVerified: boolean;
	avatarUrl: string | null;
}

export interface PublicNotificationInfo {
	id: string;
	type: string;
	title: string;
	message: string;
	metadata: Record<string, unknown> | null;
	readAt: string | null;
	createdAt: string;
}

export interface PublicBookingSummary {
	id: string;
	bookingNumber: string;
	vehicleId: string;
	vehicleName: string | null;
	startDate: string;
	endDate: string;
	status: string;
	paymentStatus: string | null;
	paymentType: string | null;
	totalAmount: number;
	dpAmount: number | null;
	paidAmount: number;
	remainingAmount: number | null;
	pickupConfirmed: boolean | null;
	pickupConfirmedAt: string | null;
	returnConfirmed: boolean | null;
	returnConfirmedAt: string | null;
	isFullyPaid: boolean;
	isPickupTime: boolean;
	pickupChecklistId: string | null;
	returnChecklistId: string | null;
	customerPickupChecklistId: string | null;
	customerReturnChecklistId: string | null;
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

function isBookingFullyPaid(b: Booking): boolean {
	const remaining = b.remainingAmount ?? 0;
	return b.paymentStatus === 'settlement' && remaining <= 0;
}

function isBookingPickupTime(b: Booking, now = new Date()): boolean {
	return now >= new Date(b.startDate);
}

function toBookingSummary(b: Booking, vehicleName?: string | null): PublicBookingSummary {
	return {
		id: b.id,
		bookingNumber: b.bookingNumber,
		vehicleId: b.vehicleId,
		vehicleName: vehicleName ?? null,
		startDate: b.startDate,
		endDate: b.endDate,
		status: b.status,
		paymentStatus: b.paymentStatus,
		paymentType: b.paymentType,
		totalAmount: b.totalAmount,
		dpAmount: b.dpAmount,
		paidAmount: Math.max(0, b.totalAmount - (b.remainingAmount ?? b.totalAmount)),
		remainingAmount: b.remainingAmount,
		pickupConfirmed: b.pickupConfirmed,
		pickupConfirmedAt: b.pickupConfirmedAt,
		returnConfirmed: b.returnConfirmed,
		returnConfirmedAt: b.returnConfirmedAt,
		isFullyPaid: isBookingFullyPaid(b),
		isPickupTime: isBookingPickupTime(b),
		pickupChecklistId: b.pickupChecklistId,
		returnChecklistId: b.returnChecklistId,
		customerPickupChecklistId: b.customerPickupChecklistId,
		customerReturnChecklistId: b.customerReturnChecklistId,
		createdAt: b.createdAt,
	};
}

function toNotificationInfo(n: PublicUserNotification): PublicNotificationInfo {
	let metadata: Record<string, unknown> | null = null;
	if (n.metadata) {
		try {
			const parsed = JSON.parse(n.metadata) as unknown;
			metadata = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
				? parsed as Record<string, unknown>
				: null;
		} catch {
			metadata = null;
		}
	}
	return {
		id: n.id,
		type: n.type,
		title: n.title,
		message: n.message,
		metadata,
		readAt: n.readAt,
		createdAt: n.createdAt,
	};
}

function normalizePhone(phone: string): string {
	const digits = phone.replace(/\D/g, '');
	if (digits.length < 8 || digits.length > 15) {
		throw new ValidationError('Nomor WhatsApp harus berisi 8-15 digit angka.');
	}
	return digits;
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
		private otpDeliveryChannel: OtpDeliveryChannel = 'web',
		private notifications: CustomerNotificationService = new CustomerNotificationService(repo, whatsapp, 'web'),
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
		webOtp?: string;
	}> {
		const phone = normalizePhone(data.phone);
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
		// Per-phone throttle (protects a victim's number from spam)
		const recent = await this.repo.countRecentVerificationByPhone(phone, oneHourAgo);
		if (recent >= MAX_INIT_PER_HOUR) {
			throw new ValidationError('Terlalu banyak permintaan OTP untuk nomor ini. Coba lagi nanti.');
		}
		// ponytail: per-user throttle (BUG#6) needs an authenticated caller; phoneInit
		// is pre-auth (only phone known), so per-phone throttle is the only applicable
		// gate here. Apply BUG#6 once a session/publicUserId exists in the caller context.

		const refCode = genRefCode();
		const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000).toISOString();
		const webOtp = this.otpDeliveryChannel === 'web' ? genOtp() : undefined;
		const otpHash = webOtp ? await sha256Hex(webOtp) : null;
		await this.repo.createVerificationCode({
			publicUserId: null,
			phone,
			refCode,
			otpCode: webOtp ?? null,
			otpHash,
			deliveryChannel: this.otpDeliveryChannel,
			status: 'otp_sent',
			type: 'phone_otp',
			consumed: false,
			attempts: 0,
			expiresAt,
		});

		const businessNumber = (await this.configRepo.getValue('whatsapp_number')) ?? '';
		const msg = encodeURIComponent(`Savanna Bromo - Login. Ref: ${refCode}`);
		const waMeUrl = this.otpDeliveryChannel === 'web'
			? ''
			: businessNumber ? `https://wa.me/${businessNumber}?text=${msg}` : '';

		if (this.otpDeliveryChannel === 'web' && webOtp) {
			await this.notifications.sendCustomerNotification({
				phone,
				type: 'otp',
				title: 'Kode OTP Login',
				message: `Kode OTP Savanna Bromo Anda: ${webOtp}. Berlaku ${OTP_EXPIRY_MIN} menit. Jangan bagikan kode ini ke siapapun.`,
				metadata: { refCode, expiresAt },
			});
		} else if (this.whatsapp.name === 'stub') {
			const simulated = await this.handleWhatsappInbound({ message: `Ref: ${refCode}` });
			return { refCode, waMeUrl, expiresAt, webOtp: simulated.otp };
		}

		return { refCode, waMeUrl, expiresAt, ...(webOtp ? { webOtp } : {}) };
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
		await this.repo.updateVerification(code.id, {
			otpCode: null,
			otpHash,
			deliveryChannel: 'whatsapp',
			status: 'otp_sent',
			expiresAt: otpExpiresAt,
		});

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
		const phone = normalizePhone(data.phone);
		// ponytail: C4 user-scoping needs a known publicUserId; verify is keyed by
		// phone+OTP and the code row is bound to the phone at init, so plain lookup
		// is sufficient. Re-add the user filter when a session user is in context.
		const code = await this.repo.findLatestVerificationByPhone(phone);
		if (!code) {
			throw new ValidationError('Tidak ada OTP aktif untuk nomor ini. Silakan minta OTP baru.');
		}
		if (!code.otpHash) {
			throw new ValidationError('OTP belum dibuat. Silakan minta OTP baru.');
		}
		if (code.attempts >= MAX_OTP_ATTEMPTS) {
			throw new ValidationError('Terlalu banyak percobaan salah. Silakan minta OTP baru.');
		}

		const hash = await sha256Hex(data.code);
		if (hash !== code.otpHash) {
			await this.repo.updateVerification(code.id, { attempts: code.attempts + 1 });
			throw new ValidationError('Kode OTP tidak valid.');
		}

		await this.repo.updateVerification(code.id, { consumed: true, status: 'verified' });

		// Find-or-create the account by phone (this is the login)
		let user = await this.repo.findByPhone(phone);
		if (!user) {
			user = await this.repo.create({
				phone,
				name: 'Customer',
				email: null,
				phoneVerified: true,
				deviceFingerprint: null,
				avatarUrl: null,
				isActive: true,
			});
		} else if (!user.phoneVerified) {
			user = await this.repo.update(user.id, { phoneVerified: true });
		}
		await this.repo.attachNotificationsToPublicUser(phone, user.id);

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

	async listNotifications(publicUserId: string): Promise<PublicNotificationInfo[]> {
		const user = await this.repo.findById(publicUserId);
		if (!user) throw new NotFoundError('Account');
		const notifications = await this.repo.listNotifications(publicUserId, user.phone);
		return notifications.map(toNotificationInfo);
	}

	async markNotificationRead(publicUserId: string, notificationId: string): Promise<PublicNotificationInfo> {
		const user = await this.repo.findById(publicUserId);
		if (!user) throw new NotFoundError('Account');
		const notification = await this.repo.markNotificationRead(notificationId, publicUserId, user.phone);
		if (!notification) throw new NotFoundError('Notification');
		return toNotificationInfo(notification);
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
		let phoneMatched: Array<{ booking: Booking; vehicleName: string | null }> = [];
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
		const all: Array<{ booking: Booking; vehicleName: string | null }> = [];
		for (const row of [...linked, ...phoneMatched]) {
			if (!seen.has(row.booking.id)) {
				seen.add(row.booking.id);
				all.push(row);
			}
		}

		return all.map((row) => toBookingSummary(row.booking, row.vehicleName));
	}

	async myBookingDetail(publicUserId: string, bookingIdOrNumber: string): Promise<PublicBookingSummary> {
		const b = await this.findBookingByIdOrNumberAndUser(publicUserId, bookingIdOrNumber);
		if (!b) throw new NotFoundError('Booking');
		const vehicle = await this.repo.findVehicleById(b.vehicleId);
		return toBookingSummary(b, vehicle?.name);
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

		if (isBookingFullyPaid(b)) {
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

	private checklistItems(phase: 'pickup' | 'return') {
		if (phase === 'pickup') {
			return [
				{ key: 'fuel_level', label: 'Bensin sesuai informasi serah-terima', required: true },
				{ key: 'tire_condition', label: 'Ban dalam kondisi baik', required: true },
				{ key: 'brake_function', label: 'Rem depan dan belakang berfungsi', required: true },
				{ key: 'lights_function', label: 'Lampu dan sein berfungsi', required: true },
				{ key: 'horn_mirror', label: 'Klakson dan spion lengkap', required: true },
				{ key: 'body_condition', label: 'Kondisi body sudah diperiksa', required: true },
				{ key: 'helmet_count', label: 'Helm diterima sesuai booking', required: true },
			];
		}
		return [
			{ key: 'engine_condition', label: 'Mesin dapat dinyalakan dan tidak bersuara aneh', required: true },
			{ key: 'tire_condition', label: 'Ban tidak bocor atau rusak', required: true },
			{ key: 'brake_function', label: 'Rem depan dan belakang berfungsi', required: true },
			{ key: 'lights_function', label: 'Lampu dan sein berfungsi', required: true },
			{ key: 'body_condition', label: 'Body sudah diperiksa untuk kerusakan baru', required: true },
			{ key: 'equipment_returned', label: 'Helm dan perlengkapan sudah dikembalikan', required: true },
		];
	}

	async scanCustomerVehicle(publicUserId: string, bookingIdOrNumber: string, qrCode: string) {
		const booking = await this.findBookingByIdOrNumberAndUser(publicUserId, bookingIdOrNumber);
		if (!booking) throw new NotFoundError('Booking');
		const vehicleId = decodeVehicleQr(qrCode);
		if (!vehicleId || vehicleId !== booking.vehicleId) throw new ValidationError('Barcode tidak sesuai dengan motor pada booking ini');

		let phase: 'pickup' | 'return';
		if (!booking.pickupConfirmed) {
			if (booking.status !== 'Confirmed') throw new ValidationError(`Booking berstatus ${booking.status} dan belum dapat diambil`);
			if (!isBookingFullyPaid(booking)) throw new ValidationError('Pembayaran harus lunas sebelum pengambilan motor');
			if (!isBookingPickupTime(booking)) throw new ValidationError('Scan pickup baru dibuka saat jadwal pengambilan sudah dimulai');
			if (Date.now() > new Date(booking.endDate).getTime()) throw new ValidationError('Jadwal booking sudah berakhir. Hubungi admin untuk penjadwalan ulang');
			phase = 'pickup';
		} else {
			if (booking.status !== 'Active') throw new ValidationError('Rental tidak sedang aktif');
			if (booking.returnConfirmed) throw new ValidationError('Pengembalian sudah diajukan dan sedang menunggu admin');
			phase = 'return';
		}

		const vehicle = await this.repo.findVehicleById(booking.vehicleId);
		if (!vehicle) throw new NotFoundError('Vehicle');
		return {
			phase,
			vehicle: { id: vehicle.id, name: vehicle.name, plateNumber: vehicle.plateNumber, type: vehicle.type, image: vehicle.photoUrl },
			booking: toBookingSummary(booking, vehicle.name),
			checklistItems: this.checklistItems(phase),
			message: phase === 'pickup' ? 'Catat kondisi awal sebelum motor digunakan.' : 'Catat kondisi akhir untuk diverifikasi admin.',
		};
	}

	async submitCustomerInspection(publicUserId: string, bookingIdOrNumber: string, data: CustomerInspectionRequest) {
		const booking = await this.findBookingByIdOrNumberAndUser(publicUserId, bookingIdOrNumber);
		if (!booking) throw new NotFoundError('Booking');
		if (decodeVehicleQr(data.qrCode) !== booking.vehicleId) throw new ValidationError('Barcode tidak sesuai dengan motor pada booking ini');
		const existing = await this.repo.findChecklist(booking.id, data.phase);
		if (existing) {
			if (existing.createdByPublicUserId !== publicUserId) throw new ValidationError(`Checklist ${data.phase} sudah pernah dikirim`);
			if (data.phase === 'pickup' && booking.pickupConfirmed) throw new ValidationError('Pickup booking ini sudah pernah dikonfirmasi');
			if (data.phase === 'return' && booking.returnConfirmed) throw new ValidationError('Pengembalian sudah diajukan dan sedang menunggu admin');
		}
		const scan = await this.scanCustomerVehicle(publicUserId, bookingIdOrNumber, data.qrCode);
		if (scan.phase !== data.phase) throw new ValidationError('Tahap pemeriksaan tidak sesuai dengan status booking');
		if (existing) {
			const repaired = await this.repo.recordExistingCustomerInspection(booking.id, data.phase, existing.id);
			const repairedVehicle = await this.repo.findVehicleById(repaired.vehicleId);
			return { booking: toBookingSummary(repaired, repairedVehicle?.name), verificationStatus: 'pending_admin' as const };
		}
		const allowedItems = this.checklistItems(data.phase);
		const allowedKeys = new Set(allowedItems.map((item) => item.key));
		const required = allowedItems.filter((item) => item.required);
		const unknownKeys = Object.keys(data.items).filter((key) => !allowedKeys.has(key));
		if (unknownKeys.length > 0) {
			throw new ValidationError(`Checklist item tidak dikenali: ${unknownKeys.join(', ')}`);
		}
		if (required.some((item) => data.items[item.key] === undefined)) throw new ValidationError('Semua checklist wajib harus diisi');
		if (Object.values(data.items).includes('issue') && !data.notes?.trim()) throw new ValidationError('Catatan wajib diisi jika ada kondisi bermasalah');

		if (data.phase === 'return' && booking.startKm !== null && data.kmReading < booking.startKm) {
			throw new ValidationError('Kilometer pengembalian tidak boleh lebih kecil dari kilometer pickup');
		}

		try {
			const result = await this.repo.createAndRecordCustomerInspection({
				bookingId: booking.id,
				vehicleId: booking.vehicleId,
				type: data.phase,
				items: data.items,
				kmReading: data.kmReading,
				fuelLevel: data.fuelLevel,
				photos: data.photos,
				notes: data.notes,
				publicUserId,
			});
			return { booking: toBookingSummary(result.booking, (await this.repo.findVehicleById(result.booking.vehicleId))?.name), verificationStatus: 'pending_admin' as const };
		} catch (error) {
			// A concurrent retry can lose the unique-index race. Recover the
			// already committed customer submission instead of surfacing a 500.
			const concurrent = await this.repo.findChecklist(booking.id, data.phase);
			if (!concurrent || concurrent.createdByPublicUserId !== publicUserId) throw error;
			const repaired = await this.repo.recordExistingCustomerInspection(booking.id, data.phase, concurrent.id);
			const repairedVehicle = await this.repo.findVehicleById(repaired.vehicleId);
			return { booking: toBookingSummary(repaired, repairedVehicle?.name), verificationStatus: 'pending_admin' as const };
		}
	}
}
