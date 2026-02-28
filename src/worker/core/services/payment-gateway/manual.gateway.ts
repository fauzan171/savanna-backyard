import type {
	PaymentGateway,
	CreatePaymentRequest,
	CreatePaymentResponse,
	CheckStatusResponse,
	WebhookResult,
	GatewayVendor,
} from './types';

/**
 * Manual payment gateway for bank transfers and cash payments.
 * No external API calls - payments are manually verified by staff.
 */
export class ManualPaymentGateway implements PaymentGateway {
	readonly name: GatewayVendor = 'manual';

	async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
		// Manual payments don't generate payment URLs
		// Return pending status, staff will verify manually
		const transactionId = `MANUAL-${Date.now()}-${request.bookingId.slice(0, 8)}`;

		return {
			success: true,
			transactionId,
		};
	}

	async checkStatus(_transactionId: string): Promise<CheckStatusResponse> {
		// Manual payments status is managed in database
		// This method shouldn't be called for manual payments
		throw new Error('Manual payments do not support status checking via gateway');
	}

	async handleWebhook(): Promise<WebhookResult> {
		// Manual payments don't have webhooks
		throw new Error('Manual payments do not support webhooks');
	}

	validateWebhookSignature(): boolean {
		// Manual payments don't have webhook signatures
		return false;
	}
}
