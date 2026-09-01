import { Hono, Context } from 'hono';
import { setCookie, getCookie } from 'hono/cookie';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { createDb } from '@/worker/core/database';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { JwtService } from '@/worker/core/services/jwt.service';
import { TokenBlacklistRepository } from '@/worker/core/repositories/token-blacklist.repository';
import { createWhatsAppProvider } from '@/worker/core/services/providers';
import { CustomerNotificationService } from '@/worker/core/services/customer-notification.service';
import { publicUserAuthMiddleware, optionalPublicUserAuth, requirePhoneVerified } from '@/worker/core/middleware/public-auth';
import {
	publicAuthInitRateLimit,
	publicAuthVerifyRateLimit,
	publicDevLoginRateLimit,
	publicVehicleScanRateLimit,
	publicInspectionUploadRateLimit,
	publicInspectionSubmitRateLimit,
} from '@/worker/core/middleware/rate-limit';
import { validateBody, getValidatedBody } from '@/worker/core/middleware/validator';
import { PublicUsersRepository } from './public-users.repository';
import { PublicUsersService } from './public-users.service';
import {
	phoneInitSchema,
	phoneVerifySchema,
	updateProfileSchema,
	confirmPickupSchema,
	customerInspectionSchema,
	devLoginSchema,
	type PhoneInitRequest,
	type PhoneVerifyRequest,
	type UpdateProfileRequest,
	type ConfirmPickupRequest,
	type CustomerInspectionRequest,
	type DevLoginRequest,
} from './public-users.dto';

type PublicUsersVariables = {
	publicUsersService: PublicUsersService;
	jwtService: JwtService;
};
type PublicUsersEnv = { Bindings: Env; Variables: PublicUsersVariables };

export const publicUsersServicesMiddleware = () => async (c: Context<PublicUsersEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const configRepo = new ConfigRepository(db);
	const jwtService = new JwtService(c.env.JWT_SECRET);
	const repo = new PublicUsersRepository(db);
	const whatsapp = await createWhatsAppProvider(configRepo);
	const otpDeliveryChannel = c.env.OTP_DELIVERY_CHANNEL === 'whatsapp' ? 'whatsapp' : 'web';
	const notificationChannel = c.env.NOTIFICATION_CHANNEL === 'whatsapp' ? 'whatsapp' : 'web';
	const notifications = new CustomerNotificationService(repo, whatsapp, notificationChannel);
	const service = new PublicUsersService(repo, jwtService, whatsapp, configRepo, otpDeliveryChannel, notifications);
	c.set('publicUsersService', service);
	c.set('jwtService', jwtService);
	await next();
};

/**
 * Set the public-user JWT in an httpOnly cookie. Cross-origin (landing page on a
 * different domain) requires SameSite=None;Secure in production over HTTPS. In dev
 * over http://localhost, Secure is dropped to Lax so cookies still work locally.
 */
function setPublicUserCookie(c: Context, token: string) {
	const isProd = c.env.ENVIRONMENT === 'production';
	setCookie(c, 'token', token, {
		httpOnly: true,
		secure: isProd,
		sameSite: isProd ? 'None' : 'Lax',
		maxAge: 60 * 60 * 24 * 7, // 7 days
		path: '/',
	});
}

function clearPublicUserCookie(c: Context) {
	const isProd = c.env.ENVIRONMENT === 'production';
	setCookie(c, 'token', '', {
		httpOnly: true,
		secure: isProd,
		sameSite: isProd ? 'None' : 'Lax',
		maxAge: 0,
		path: '/',
	});
}

// ---- Login (phone + WhatsApp OTP) — no cookie required, these SET the cookie ----
const phoneInitHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const body = getValidatedBody<PhoneInitRequest>(c);
	const result = await service.phoneInit(body);
	return c.json({ success: true, message: 'OTP berhasil dibuat', data: result });
};

const phoneVerifyHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const body = getValidatedBody<PhoneVerifyRequest>(c);
	const result = await service.phoneVerify(body);
	setPublicUserCookie(c, result.token);
	return c.json({ success: true, message: 'Logged in', data: { user: result.user } });
};

/**
 * Developer email login. Allowlist comes from DEVELOPER_ALLOWLIST env (comma-separated).
 * ponytail: in dev (ENVIRONMENT !== production) with no allowlist configured, fall back
 * to a single dev@savanna.com entry so local/staging works out of the box. Prod with no
 * env = fully disabled (fail-closed in the service).
 */
function resolveDevAllowlist(env: Env): string[] {
	const raw = env.DEVELOPER_ALLOWLIST?.trim();
	if (raw) {
		return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
	}
	return env.ENVIRONMENT === 'production' ? [] : ['dev@savanna.com'];
}

const devLoginHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const body = getValidatedBody<DevLoginRequest>(c);
	const allowlist = resolveDevAllowlist(c.env);
	const result = await service.devLogin(body, allowlist);
	console.log(`[dev-login] developer login: ${body.email}`);
	setPublicUserCookie(c, result.token);
	return c.json({ success: true, message: 'Logged in', data: { user: result.user } });
};

// ---- Account (cookie-authenticated) ----
const meHandler = async (c: Context<PublicUsersEnv>) => {
	const pu = c.get('publicUser');
	if (!pu) {
		// No valid public-user token (guest, or admin token was ignored by optional middleware)
		return c.json({ success: true, data: null });
	}
	const service = c.get('publicUsersService');
	const user = await service.getMe(pu.publicUserId);
	return c.json({ success: true, data: user });
};

const profileHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const pu = c.get('publicUser');
	const body = getValidatedBody<UpdateProfileRequest>(c);
	const user = await service.updateProfile(pu.publicUserId, body);
	return c.json({ success: true, data: user });
};

const logoutHandler = async (c: Context<PublicUsersEnv>) => {
	const token = getCookie(c, 'token');
	if (token) {
		try {
			const decoded = jwt.decode(token) as { payload: { jti?: string; exp?: number; userId?: string } };
			if (decoded?.payload?.jti && decoded?.payload?.exp && decoded?.payload?.userId) {
				const db = createDb(c.env.DB);
				const tokenBlacklistRepo = new TokenBlacklistRepository(db);
				const expiresAt = new Date(decoded.payload.exp * 1000).toISOString();
				await tokenBlacklistRepo.add({
					jti: decoded.payload.jti,
					userId: decoded.payload.userId,
					tokenHash: await hashToken(token),
					expiresAt,
				});
			}
		} catch (error) {
			console.error('Failed to blacklist public-user token:', error);
		}
	}
	clearPublicUserCookie(c);
	return c.json({ success: true, message: 'Logged out' });
};

async function hashToken(token: string): Promise<string> {
	const data = new TextEncoder().encode(token);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Public-user auth router. Mounted under /api/v1/public/auth (inherits X-API-Key + CORS).
export function createPublicAuthRouter(): Hono<PublicUsersEnv> {
	const router = new Hono<PublicUsersEnv>();
	router.use('*', publicUsersServicesMiddleware());

	// Login (no cookie yet)
	router.post('/phone/init', publicAuthInitRateLimit(), validateBody(phoneInitSchema), phoneInitHandler);
	router.post('/phone/verify', publicAuthVerifyRateLimit(), validateBody(phoneVerifySchema), phoneVerifyHandler);
	router.post('/dev/login', publicDevLoginRateLimit(), validateBody(devLoginSchema), devLoginHandler);

	// /me: graceful fallback — returns null when no valid public-user token
	// (guests, or admin cookies that are ignored by optionalPublicUserAuth)
	router.get('/me', optionalPublicUserAuth(), meHandler);
	router.put('/profile', publicUserAuthMiddleware(), validateBody(updateProfileSchema), profileHandler);
	router.post('/logout', publicUserAuthMiddleware(), logoutHandler);

	return router;
}

// ---- /me: account-scoped booking access (mounted under /api/v1/public/me) ----
const myBookingsHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const pu = c.get('publicUser');
	const result = await service.myBookings(pu.publicUserId);
	return c.json({ success: true, data: result });
};

const myBookingDetailHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const pu = c.get('publicUser');
	const result = await service.myBookingDetail(pu.publicUserId, c.req.param('id'));
	return c.json({ success: true, data: result });
};

const notificationsHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const pu = c.get('publicUser');
	const result = await service.listNotifications(pu.publicUserId);
	return c.json({ success: true, data: result });
};

const markNotificationReadHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const pu = c.get('publicUser');
	const result = await service.markNotificationRead(pu.publicUserId, c.req.param('id'));
	return c.json({ success: true, data: result });
};

const payRemainingHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const pu = c.get('publicUser');

	// Build payment gateway config from env vars for remainder invoice creation
	const vendor = c.env.PAYMENT_GATEWAY_VENDOR ?? 'xendit';
	let gatewayConfig: { vendor: string; config: Record<string, string> };
	if (vendor === 'xendit') {
		gatewayConfig = {
			vendor,
			config: { apiKey: c.env.XENDIT_API_KEY ?? '', webhookToken: c.env.XENDIT_WEBHOOK_TOKEN ?? '', isProduction: c.env.ENVIRONMENT === 'production' ? 'true' : 'false' },
		};
	} else if (vendor === 'ifortepay') {
		gatewayConfig = {
			vendor,
			config: { merchantId: c.env.IFORTEPAY_MERCHANT_ID ?? '', secretUnboundId: c.env.IFORTEPAY_SECRET_UNBOUND_ID ?? '', hashKey: c.env.IFORTEPAY_HASH_KEY ?? '', callbackUrl: c.env.IFORTEPAY_CALLBACK_URL ?? '', successRedirectUrl: c.env.IFORTEPAY_SUCCESS_REDIRECT_URL ?? '', failedRedirectUrl: c.env.IFORTEPAY_FAILED_REDIRECT_URL ?? '' },
		};
	} else {
		gatewayConfig = { vendor, config: {} };
	}

	const result = await service.payRemaining(pu.publicUserId, c.req.param('bookingId'), gatewayConfig);
	return c.json({ success: true, message: 'Remainder payment invoice created', data: result });
};

const scanCustomerVehicleHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const pu = c.get('publicUser');
	const body = getValidatedBody<ConfirmPickupRequest>(c);
	const result = await service.scanCustomerVehicle(pu.publicUserId, c.req.param('id'), body.qrCode);
	return c.json({ success: true, data: result });
};

const submitCustomerInspectionHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const pu = c.get('publicUser');
	const body = getValidatedBody<CustomerInspectionRequest>(c);
	if (!c.env.UPLOADS) return c.json({ success: false, error: { code: 'NO_BUCKET', message: 'R2 bucket not configured' } }, 500);
	const booking = await service.myBookingDetail(pu.publicUserId, c.req.param('id'));
	const prefix = `customer-inspections/${booking.id}/${body.phase}/`;
	for (const photo of body.photos) {
		let pathname = photo;
		try {
			if (photo.startsWith('http')) pathname = new URL(photo).pathname;
		} catch {
			return c.json({ success: false, error: { code: 'INVALID_PHOTO', message: 'Inspection photo path is invalid' } }, 400);
		}
		const marker = '/api/v1/uploads/';
		if (!pathname.startsWith(marker)) return c.json({ success: false, error: { code: 'INVALID_PHOTO', message: 'Inspection photo path is invalid' } }, 400);
		const key = decodeURIComponent(pathname.slice(marker.length));
		if (!key.startsWith(prefix) || !(await c.env.UPLOADS.head(key))) {
			return c.json({ success: false, error: { code: 'INVALID_PHOTO', message: 'Inspection photo does not belong to this booking and phase' } }, 400);
		}
	}
	const result = await service.submitCustomerInspection(pu.publicUserId, c.req.param('id'), body);
	return c.json({ success: true, message: 'Vehicle inspection submitted', data: result }, 201);
};

const INSPECTION_MAGIC_BYTES: Record<string, number[]> = {
	'image/jpeg': [0xff, 0xd8, 0xff],
	'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
	'image/webp': [0x52, 0x49, 0x46, 0x46],
};

const uploadCustomerInspectionPhotoHandler = async (c: Context<PublicUsersEnv>) => {
	const service = c.get('publicUsersService');
	const pu = c.get('publicUser');
	const bookingId = c.req.param('id');
	if (!c.env.UPLOADS) return c.json({ success: false, error: { code: 'NO_BUCKET', message: 'R2 bucket not configured' } }, 500);
	if (!(c.req.header('Content-Type') ?? '').startsWith('multipart/form-data')) {
		return c.json({ success: false, error: { code: 'INVALID_CONTENT_TYPE', message: 'Expected multipart/form-data' } }, 400);
	}
	const form = await c.req.formData();
	const qrCode = form.get('qrCode');
	const phase = form.get('phase');
	if (typeof qrCode !== 'string' || (phase !== 'pickup' && phase !== 'return')) {
		return c.json({ success: false, error: { code: 'INVALID_CONTEXT', message: 'qrCode and phase are required' } }, 400);
	}
	const scan = await service.scanCustomerVehicle(pu.publicUserId, bookingId, qrCode);
	if (scan.phase !== phase) return c.json({ success: false, error: { code: 'INVALID_PHASE', message: 'Inspection phase is no longer valid' } }, 409);
	const prefix = `customer-inspections/${scan.booking.id}/${phase}/`;
	const existingUploads = await c.env.UPLOADS.list({ prefix, limit: 8 });
	if (existingUploads.objects.length >= 8) return c.json({ success: false, error: { code: 'UPLOAD_LIMIT', message: 'Photo upload limit reached for this inspection' } }, 429);
	const file = form.get('file');
	if (!file || typeof file === 'string') return c.json({ success: false, error: { code: 'NO_FILE', message: 'No file provided' } }, 400);
	const upload = file as unknown as File;
	if (!Object.hasOwn(INSPECTION_MAGIC_BYTES, upload.type)) {
		return c.json({ success: false, error: { code: 'INVALID_TYPE', message: 'Only JPEG, PNG, and WebP images are allowed' } }, 400);
	}
	if (upload.size > 5 * 1024 * 1024) return c.json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'File must be under 5MB' } }, 400);
	const buffer = await upload.arrayBuffer();
	const bytes = new Uint8Array(buffer.slice(0, 12));
	const primaryMagicValid = INSPECTION_MAGIC_BYTES[upload.type]!.every((byte, index) => bytes[index] === byte);
	const webpMagicValid = upload.type !== 'image/webp' || String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
	if (!primaryMagicValid || !webpMagicValid) {
		return c.json({ success: false, error: { code: 'INVALID_FILE', message: 'File content does not match its type' } }, 400);
	}
	const extension = upload.type === 'image/png' ? 'png' : upload.type === 'image/webp' ? 'webp' : 'jpg';
	const key = `${prefix}${crypto.randomUUID()}.${extension}`;
	await c.env.UPLOADS.put(key, buffer, { httpMetadata: { contentType: upload.type } });
	const path = `/api/v1/uploads/${key}`;
	return c.json({ success: true, data: { key, url: path } }, 201);
};

export function createPublicMeRouter(): Hono<PublicUsersEnv> {
	const router = new Hono<PublicUsersEnv>();
	router.use('*', publicUsersServicesMiddleware());
	router.use('*', publicUserAuthMiddleware());

	router.get('/bookings', myBookingsHandler);
	router.get('/bookings/:id', myBookingDetailHandler);
	router.get('/notifications', notificationsHandler);
	router.post('/notifications/:id/read', markNotificationReadHandler);
	// Pay the remainder requires a verified account (anti-abuse)
	router.post('/bookings/:bookingId/pay-remaining', requirePhoneVerified(), payRemainingHandler);
	router.post('/bookings/:id/scan-vehicle', requirePhoneVerified(), publicVehicleScanRateLimit(), validateBody(confirmPickupSchema), scanCustomerVehicleHandler);
	router.post('/bookings/:id/inspection-photos', requirePhoneVerified(), publicInspectionUploadRateLimit(), uploadCustomerInspectionPhotoHandler);
	router.post('/bookings/:id/inspections', requirePhoneVerified(), publicInspectionSubmitRateLimit(), validateBody(customerInspectionSchema), submitCustomerInspectionHandler);

	return router;
}
