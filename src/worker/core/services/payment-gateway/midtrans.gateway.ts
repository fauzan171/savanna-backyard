import type {
	PaymentGateway,
	CreatePaymentRequest,
	CreatePaymentResponse,
	CheckStatusResponse,
	WebhookResult,
	GatewayVendor,
} from './types';

export class MidtransGateway implements PaymentGateway {
	readonly name: GatewayVendor = 'midtrans';
	private serverKey: string;

	constructor(config: { serverKey: string; clientKey: string; isProduction: boolean }) {
		this.serverKey = config.serverKey;
	}

	async createPayment(_request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
		return {
			success: false,
			error: { code: 'NOT_IMPLEMENTED', message: 'Use snapToken from booking creation' },
		};
	}

	async checkStatus(_transactionId: string): Promise<CheckStatusResponse> {
		throw new Error('Not implemented');
	}

	async handleWebhook(payload: unknown, _headers: Record<string, string>): Promise<WebhookResult> {
		const data = payload as Record<string, string>;

		// Validate signature
		const isValid = await this.validateWebhookSignatureAsync(data);
		if (!isValid) throw new Error('Invalid signature');

		const status = data.transaction_status;
		const fraudStatus = data.fraud_status;

		let paymentStatus: 'Pending' | 'Verified' | 'Failed' = 'Pending';
		if ((status === 'capture' && fraudStatus === 'accept') || status === 'settlement') {
			paymentStatus = 'Verified';
		} else if (status === 'cancel' || status === 'deny' || status === 'expire') {
			paymentStatus = 'Failed';
		}

		return {
			success: true,
			transactionId: data.transaction_id,
			status: paymentStatus,
			amount: parseFloat(data.gross_amount),
			paidAt: paymentStatus === 'Verified' ? new Date().toISOString() : undefined,
		};
	}

	validateWebhookSignature(_payload: unknown, _signature: string): boolean {
		return true; // sync stub, actual validation in handleWebhook
	}

	private async validateWebhookSignatureAsync(data: Record<string, string>): Promise<boolean> {
		const raw = `${data.order_id}${data.status_code}${data.gross_amount}${this.serverKey}`;
		const encoded = new TextEncoder().encode(raw);
		const hashBuffer = await crypto.subtle.digest('SHA-512', encoded);
		const computed = Array.from(new Uint8Array(hashBuffer))
			.map(b => b.toString(16).padStart(2, '0'))
			.join('');
		return computed === data.signature_key;
	}
}