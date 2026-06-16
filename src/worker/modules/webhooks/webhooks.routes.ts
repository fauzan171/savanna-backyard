import { Hono, Context } from 'hono';
import { createDb } from '@/worker/core/database';
import { WebhooksService } from './webhooks.service';

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

	const service = new WebhooksService(createDb(c.env.DB));

	// Process notification
	await service.handleiFortePayNotification(data);

	return c.json({ success: true, message: 'OK' });
};

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
		console.error('XENDIT_WEBHOOK_TOKEN not configured');
		return c.json({ success: false, message: 'Webhook token not configured' }, 500);
	}

	// Verify X-CALLBACK-TOKEN header
	const callbackToken = c.req.header('x-callback-token') ?? '';
	if (callbackToken !== webhookToken) {
		console.error('Invalid Xendit webhook signature');
		return c.json({ success: false, message: 'Invalid signature' }, 401);
	}

	const service = new WebhooksService(createDb(c.env.DB));
	await service.handleXenditNotification(data);

	return c.json({ success: true, message: 'OK' });
};

export function createWebhookRouter(): Hono<WebhookEnv> {
	const router = new Hono<WebhookEnv>();

	router.post('/midtrans/notification', midtransNotificationHandler);
	router.post('/ifortepay/notification', ifortepayNotificationHandler);
	router.post('/xendit/notification', xenditNotificationHandler);

	return router;
}
