import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import {
	PaymentGatewayFactory,
	type GatewayVendor,
	type PaymentGateway,
} from '@/worker/core/services/payment-gateway';

// Type for storing services in context
type PaymentsVariables = {
	configRepository: ConfigRepository;
	user: { userId: string; role: 'SUPER_ADMIN' | 'STAFF' };
};

type PaymentsEnv = { Bindings: Env; Variables: PaymentsVariables };

// Middleware to inject services into context
export const paymentsServicesMiddleware = () => async (c: Context<PaymentsEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const configRepository = new ConfigRepository(db);

	c.set('configRepository', configRepository);
	await next();
};

// Helper to get configured gateway
async function getGateway(configRepo: ConfigRepository): Promise<PaymentGateway> {
	const vendor = (await configRepo.getValue('payment_gateway_vendor')) as GatewayVendor ?? 'manual';

	const config: Record<string, string> = {};

	if (vendor === 'midtrans') {
		config.serverKey = await configRepo.getValue('midtrans_server_key') ?? '';
		config.clientKey = await configRepo.getValue('midtrans_client_key') ?? '';
		config.isProduction = await configRepo.getValue('midtrans_is_production') ?? 'false';
	} else if (vendor === 'xendit') {
		config.apiKey = await configRepo.getValue('xendit_api_key') ?? '';
		config.isProduction = await configRepo.getValue('xendit_is_production') ?? 'false';
	}

	return PaymentGatewayFactory.create(vendor, config);
}

// Route handlers
const getGatewayStatusHandler = async (c: Context<PaymentsEnv>) => {
	const configRepo = c.get('configRepository');

	const vendor = await configRepo.getValue('payment_gateway_vendor') ?? 'manual';
	const isConfigured = vendor !== 'manual';

	// Get supported methods based on vendor
	const supportedMethods = vendor === 'manual'
		? ['BankTransfer', 'Cash']
		: ['QRIS', 'Gateway', 'BankTransfer'];

	return c.json({
		success: true,
		data: {
			vendor,
			isConfigured,
			supportedMethods,
		},
	});
};

const handleWebhookHandler = async (c: Context<PaymentsEnv>) => {
	const configRepo = c.get('configRepository');
	const vendor = c.req.param('vendor') as GatewayVendor;

	// Validate vendor matches configured gateway
	const configuredVendor = await configRepo.getValue('payment_gateway_vendor') ?? 'manual';
	if (vendor !== configuredVendor) {
		return c.json({
			success: false,
			error: { code: 'INVALID_VENDOR', message: 'Webhook vendor does not match configured gateway' },
		}, 400);
	}

	try {
		const gateway = await getGateway(configRepo);
		const payload = await c.req.json();
		const headers = Object.fromEntries(c.req.raw.headers);

		await gateway.handleWebhook(payload, headers);

		// TODO: Update payment status in database when payment module is fully implemented

		return c.json({ success: true, message: 'Webhook processed' });
	} catch (error) {
		console.error('Webhook processing error:', error);
		return c.json({
			success: false,
			error: { code: 'WEBHOOK_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
		}, 500);
	}
};

// Factory function to create payments router
export function createPaymentsRouter(): Hono<PaymentsEnv> {
	const router = new Hono<PaymentsEnv>();

	// Apply services middleware to all payments routes
	router.use('*', paymentsServicesMiddleware());

	// Gateway status endpoint (requires auth)
	router.get('/gateway/status', authMiddleware(), getGatewayStatusHandler);

	// Webhook endpoint (no auth - validated by signature)
	router.post('/webhooks/:vendor', handleWebhookHandler);

	return router;
}
