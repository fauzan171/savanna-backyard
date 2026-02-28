import type {
	PaymentGateway,
	CreatePaymentRequest,
	CreatePaymentResponse,
	CheckStatusResponse,
	WebhookResult,
	GatewayVendor,
} from './types';

/**
 * Xendit payment gateway integration.
 * Supports: Invoice, E-Wallet, QRIS, Virtual Account
 *
 * NOTE: This is a placeholder implementation. Full implementation
 * requires Xendit SDK or API integration.
 */
export class XenditGateway implements PaymentGateway {
	readonly name: GatewayVendor = 'xendit';

	constructor(_config: { apiKey: string; isProduction: boolean }) {
		// Config stored for future implementation
	}

	async createPayment(_request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
		// TODO: Implement Xendit API call
		// Different endpoints for different payment methods

		// Placeholder - return error indicating not implemented
		return {
			success: false,
			error: {
				code: 'NOT_IMPLEMENTED',
				message: 'Xendit integration not yet implemented',
			},
		};
	}

	async checkStatus(_transactionId: string): Promise<CheckStatusResponse> {
		// TODO: Implement status check
		throw new Error('Xendit integration not yet implemented');
	}

	async handleWebhook(_payload: unknown, _headers: Record<string, string>): Promise<WebhookResult> {
		// TODO: Validate webhook using callback verification token
		throw new Error('Xendit integration not yet implemented');
	}

	validateWebhookSignature(_payload: unknown, _signature: string): boolean {
		// TODO: Verify HMAC-SHA256 with webhook secret
		throw new Error('Xendit integration not yet implemented');
	}
}
