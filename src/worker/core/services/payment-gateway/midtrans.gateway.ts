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
 *
 * Payment creation uses Snap API (handled in public-api.service via iFortePay/Snap flow).
 * This gateway focuses on status checking and webhook handling.
 *
 * Docs: https://docs.midtrans.com/
 */
export class MidtransGateway implements PaymentGateway {
	readonly name: GatewayVendor = 'midtrans';
	private serverKey: string;
	private baseUrl: string;

	constructor(config: { serverKey: string; clientKey: string; isProduction: boolean }) {
		this.serverKey = config.serverKey;
		this.baseUrl = config.isProduction
			? 'https://api.midtrans.com'
			: 'https://api.sandbox.midtrans.com';
	}

	private getAuthHeader(): string {
		// Midtrans uses Basic auth with Base64(serverKey:) — empty password
		return `Basic ${btoa(`${this.serverKey}:`)}`;
	}

	/**
	 * Create payment is handled via Snap API during booking creation
	 * (see public-api.service.ts createPublicBooking).
	 * This method returns guidance to use the Snap token from booking creation.
	 */
	async createPayment(_request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
		return {
			success: false,
			error: { code: 'NOT_IMPLEMENTED', message: 'Use snapToken from booking creation' },
		};
	}

	/**
	 * Check payment status via Midtrans Transaction Status API.
	 * GET /v2/{order_id}/status
	 */
	async checkStatus(orderId: string): Promise<CheckStatusResponse> {
		try {
			const response = await fetch(`${this.baseUrl}/v2/${orderId}/status`, {
				headers: {
					'Authorization': this.getAuthHeader(),
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error('Midtrans status check error:', response.status, errorText);
				throw new Error(`Midtrans status check failed: ${response.status}`);
			}

			const data = (await response.json()) as Record<string, string>;
			const status = this.mapTransactionStatus(data.transaction_status, data.fraud_status);

			return {
				transactionId: data.transaction_id ?? orderId,
				status,
				paidAt: status === 'Verified' ? (data.settlement_time ?? data.transaction_time) : undefined,
				amount: data.gross_amount ? parseFloat(data.gross_amount) : undefined,
				metadata: data,
			};
		} catch (error) {
			if (error instanceof Error) throw error;
			throw new Error('Failed to check Midtrans payment status');
		}
	}

	/**
	 * Handle webhook notification from Midtrans.
	 * Verifies signature then maps transaction status.
	 */
	async handleWebhook(payload: unknown, _headers: Record<string, string>): Promise<WebhookResult> {
		const data = payload as Record<string, string>;

		// Validate signature
		const isValid = await this.validateWebhookSignatureAsync(data);
		if (!isValid) throw new Error('Invalid signature');

		const status = this.mapTransactionStatus(data.transaction_status, data.fraud_status);

		return {
			success: true,
			transactionId: data.transaction_id ?? '',
			status,
			amount: data.gross_amount ? parseFloat(data.gross_amount) : 0,
			paidAt: status === 'Verified' ? (data.settlement_time ?? new Date().toISOString()) : undefined,
		};
	}

	/**
	 * Synchronous signature validation (basic check).
	 * Full async validation is in validateWebhookSignatureAsync.
	 */
	validateWebhookSignature(payload: unknown, _signature: string): boolean {
		const data = payload as Record<string, string> | null;
		if (!data) return false;
		// Basic presence check; full verification requires async SHA-512
		return Boolean(data.order_id && data.status_code && data.gross_amount && data.signature_key);
	}

	/**
	 * Verify Midtrans webhook signature.
	 * Signature = SHA-512(order_id + status_code + gross_amount + server_key)
	 */
	private async validateWebhookSignatureAsync(data: Record<string, string>): Promise<boolean> {
		if (!this.serverKey) return false;
		const raw = `${data.order_id}${data.status_code}${data.gross_amount}${this.serverKey}`;
		const encoded = new TextEncoder().encode(raw);
		const hashBuffer = await crypto.subtle.digest('SHA-512', encoded);
		const computed = Array.from(new Uint8Array(hashBuffer))
			.map(b => b.toString(16).padStart(2, '0'))
			.join('');
		return computed === data.signature_key;
	}

	/**
	 * Map Midtrans transaction_status + fraud_status to internal PaymentStatus.
	 *
	 * Reference: https://docs.midtrans.com/reference/transaction-status
	 */
	private mapTransactionStatus(
		transactionStatus: string,
		fraudStatus?: string
	): 'Pending' | 'Verified' | 'Failed' {
		switch (transactionStatus) {
			case 'capture':
				// Credit card: verify fraud status
				return fraudStatus === 'challenge' ? 'Pending' : 'Verified';
			case 'settlement':
				return 'Verified';
			case 'pending':
				return 'Pending';
			case 'deny':
			case 'cancel':
			case 'expire':
			case 'failure':
				return 'Failed';
			case 'refund':
				// Refunded payments are considered failed from collection perspective
				return 'Failed';
			case 'partial_refund':
				return 'Pending';
			default:
				return 'Pending';
		}
	}
}
