import { Hono, Context } from 'hono';
import { createDb } from '@/worker/core/database';
import { WebhooksService } from './webhooks.service';
import { EmailService } from '@/worker/core/services/email.service';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { JwtService } from '@/worker/core/services/jwt.service';
import { createWhatsAppProvider } from '@/worker/core/services/providers';
import { PublicUsersRepository } from '@/worker/modules/public-users/public-users.repository';
import { PublicUsersService } from '@/worker/modules/public-users/public-users.service';
import { timingSafeEqualSync } from '@/worker/core/lib/crypto-safe-equal';

type WebhookEnv = { Bindings: Env };

const midtransNotificationHandler = async (c: Context<WebhookEnv>) => {
	let data: Record<string, string>;
	try {
		const text = await c.req.text();
		data = text ? JSON.parse(text) : {};
	} catch {
		return c.json({ status_code: '400', status_message: 'Invalid JSON' }, 400);
	}

	const serverKey = c.env.MIDTRANS_SERVER_KEY ?? '';

	if (!serverKey) {
		console.error('MIDTRANS_SERVER_KEY not configured');
		return c.json({ status_code: '500', status_message: 'Server key not configured' }, 500);
	}

	// Verify signature
	const service = new WebhooksService(createDb(c.env.DB));
	const isValid = await service.verifySignature(data, serverKey);
	if (!isValid) {
		console.error('Invalid Midtrans signature');
		return c.json({ status_code: '401', status_message: 'Invalid signature' }, 401);
	}

	// Process notification
	await service.handleMidtransNotification(data);

	return c.json({ status_code: '200', status_message: 'OK' });
};

const ifortepayNotificationHandler = async (c: Context<WebhookEnv>) => {
	let data: Record<string, unknown>;
	try {
		const text = await c.req.text();
		data = text ? JSON.parse(text) : {};
	} catch {
		return c.json({ success: false, message: 'Invalid JSON' }, 400);
	}

	// A1: iFortePay signature verification (fail-closed).
	// The gateway is not currently active (PAYMENT_GATEWAY_VENDOR=xendit), but
	// the route must not accept unauthenticated requests. If no hash key is
	// configured, the route is disabled (410 Gone) rather than accepting all.
	const hashKey = c.env.IFORTEPAY_HASH_KEY ?? '';
	if (!hashKey) {
		return c.json(
			{ success: false, message: 'iFortePay webhook is not configured' },
			410,
		);
	}

	const providedSignature = c.req.header('mcp-signature') ?? c.req.header('x-req-signature') ?? '';
	if (!providedSignature) {
		return c.json({ success: false, message: 'Missing signature header' }, 401);
	}

	// Verify signature: SHA-256(hashKey + externalId + orderId) hex, matching
	// the outbound request signing convention used by the gateway.
	const orderId = (data.order_id as string) ?? '';
	const externalId = (data.external_id as string) ?? orderId;
	const expectedSig = await computeIfortepaySignature(hashKey, externalId, orderId);
	if (!timingSafeEqualSync(providedSignature, expectedSig)) {
		console.error('Invalid iFortePay webhook signature');
		return c.json({ success: false, message: 'Invalid signature' }, 401);
	}

	const service = new WebhooksService(createDb(c.env.DB));

	// Process notification
	await service.handleiFortePayNotification(data);

	return c.json({ success: true, message: 'OK' });
};

/** Computes the iFortePay webhook signature: SHA-256(hashKey + externalId + orderId). */
async function computeIfortepaySignature(hashKey: string, externalId: string, orderId: string): Promise<string> {
	const raw = `${hashKey}${externalId}${orderId}`;
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Xendit webhook handler.
 * Xendit sends the X-CALLBACK-TOKEN header which must match the
 * verification token configured in the Xendit dashboard.
 *
 * Docs: https://developers.xendit.co/api-reference/#webhooks
 */
const xenditNotificationHandler = async (c: Context<WebhookEnv>) => {
	let data: Record<string, unknown>;
	try {
		const text = await c.req.text();
		data = text ? JSON.parse(text) : {};
	} catch {
		return c.json({ success: false, message: 'Invalid JSON' }, 400);
	}

	const webhookToken = c.env.XENDIT_WEBHOOK_TOKEN ?? '';

	if (!webhookToken) {
		console.error('[Xendit Webhook] XENDIT_WEBHOOK_TOKEN not configured. Run: npx wrangler secret put XENDIT_WEBHOOK_TOKEN');
		return c.json({ success: false, message: 'Webhook token not configured. Server admin: set XENDIT_WEBHOOK_TOKEN via wrangler secret put.' }, 500);
	}

	// Verify X-CALLBACK-TOKEN header (timing-safe to avoid side-channel)
	const callbackToken = c.req.header('x-callback-token') ?? '';
	if (!timingSafeEqualSync(callbackToken, webhookToken)) {
		console.error('Invalid Xendit webhook signature');
		return c.json({ success: false, message: 'Invalid signature' }, 401);
	}

	// Initialize email service if Resend API key is configured
	let emailService: EmailService | undefined;
	if (c.env.RESEND_API_KEY) {
		emailService = new EmailService({
			apiKey: c.env.RESEND_API_KEY,
			fromEmail: c.env.EMAIL_FROM ?? 'Savanna Bromo <noreply@savannabromo.com>',
		});
	}

	const service = new WebhooksService(createDb(c.env.DB), emailService);

	// Persist the payment and booking state before acknowledging the webhook.
	// Returning 200 while this runs in waitUntil can permanently lose a payment:
	// Xendit stops retrying even when the background database update fails.
	// The service is idempotent by invoice id, so a timeout/retry is safe.
	await service.handleXenditNotification(data);

	return c.json({ success: true, message: 'OK' });
};

/**
 * WhatsApp inbound webhook for the phone-OTP flow.
 * The user sends the Ref code (from /public/auth/phone/init) to the WhatsApp business
 * number; the provider forwards the inbound message here. We parse the Ref, generate
 * an OTP, store its hash, and reply the OTP via WhatsApp.
 *
 * Verification: shared secret via `x-whatsapp-token` header or `?token=` query, set as
 * WHATSAPP_WEBHOOK_TOKEN. When unset (stub/dev), the request is accepted so the flow
 * works locally without a provider configured.
 */
const whatsappInboundHandler = async (c: Context<WebhookEnv>) => {
	let data: Record<string, unknown>;
	try {
		const text = await c.req.text();
		data = text ? JSON.parse(text) : {};
	} catch {
		return c.json({ success: false, message: 'Invalid JSON' }, 400);
	}

	// C3: fail-closed. If WHATSAPP_WEBHOOK_TOKEN is not set, reject all
	// requests rather than silently accepting them (prevents unauthenticated
	// OTP generation / message-sending abuse).
	const secret = c.env.WHATSAPP_WEBHOOK_TOKEN;
	if (!secret) {
		console.error('WHATSAPP_WEBHOOK_TOKEN not configured');
		return c.json({ success: false, message: 'Webhook token not configured' }, 500);
	}
	const provided = c.req.header('x-whatsapp-token') ?? c.req.query('token') ?? '';
	if (!timingSafeEqualSync(provided, secret)) {
		return c.json({ success: false, message: 'Invalid signature' }, 401);
	}

	const db = createDb(c.env.DB);
	const configRepo = new ConfigRepository(db);
	const jwtService = new JwtService(c.env.JWT_SECRET);
	const repo = new PublicUsersRepository(db);
	const whatsapp = await createWhatsAppProvider(configRepo);
	const service = new PublicUsersService(repo, jwtService, whatsapp, configRepo);

	await service.handleWhatsappInbound(data);
	return c.json({ success: true, message: 'OK' });
};

export function createWebhookRouter(): Hono<WebhookEnv> {
	const router = new Hono<WebhookEnv>();

	router.post('/midtrans/notification', midtransNotificationHandler);
	router.post('/ifortepay/notification', ifortepayNotificationHandler);
	router.post('/xendit/notification', xenditNotificationHandler);
	router.post('/whatsapp', whatsappInboundHandler);

	return router;
}
