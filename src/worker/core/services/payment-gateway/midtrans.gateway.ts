import type {
	PaymentGateway,
	CreatePaymentRequest,
	CreatePaymentResponse,
	CheckStatusResponse,
	WebhookResult,
	GatewayVendor,
} from './types';

/**
 * Midtrans payment gateway integration.
 * Supports: Credit Card, Bank Transfer, E-Wallet, QRIS
 *
 * NOTE: This is a placeholder implementation. Full implementation
 * requires Midtrans SDK or API integration.
 */
export class MidtransGateway implements PaymentGateway {
	readonly name: GatewayVendor = 'midtrans';

	constructor(_config: { serverKey: string; clientKey: string; isProduction: boolean }) {
		// Config stored for future implementation
	}

	async createPayment(_request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
		// TODO: Implement Midtrans API call
		// POST to /v2/charge
		// Build request body based on payment method
		// Return payment URL / QR code / VA number

		// Placeholder - return error indicating not implemented
		return {
			success: false,
			error: {
				code: 'NOT_IMPLEMENTED',
				message: 'Midtrans integration not yet implemented',
			},
		};
	}

	async checkStatus(_transactionId: string): Promise<CheckStatusResponse> {
		// TODO: GET /v2/{transaction_id}/status
		throw new Error('Midtrans integration not yet implemented');
	}

	async handleWebhook(_payload: unknown, _headers: Record<string, string>): Promise<WebhookResult> {
		// TODO: Validate signature from Midtrans
		// Parse notification payload
		// Return standardized result
		throw new Error('Midtrans integration not yet implemented');
	}

	validateWebhookSignature(_payload: unknown, _signature: string): boolean {
		// TODO: Verify SHA512 signature
		// Signature = SHA512(order_id + status + gross_amount + server_key)
		throw new Error('Midtrans integration not yet implemented');
	}
}
