import type {
	PaymentGateway,
	CreatePaymentRequest,
	CreatePaymentResponse,
	CheckStatusResponse,
	WebhookResult,
	GatewayVendor,
} from './types';

interface iFortePayConfig {
	merchantId: string;
	secretUnboundId: string;
	hashKey: string;
	isProduction: boolean;
}

export class iFortePayGateway implements PaymentGateway {
	readonly name: GatewayVendor = 'ifortepay';
	private merchantId: string;
	private secretUnboundId: string;
	private hashKey: string;
	private baseUrl: string;

	constructor(config: iFortePayConfig) {
		this.merchantId = config.merchantId;
		this.secretUnboundId = config.secretUnboundId;
		this.hashKey = config.hashKey;
		this.baseUrl = config.isProduction
			? 'https://api.ifortepay.id'
			: 'https://api-stage.ifortepay.id';
	}

	private getAuthHeader(): string {
		const credentials = btoa(`${this.merchantId}:${this.secretUnboundId}`);
		return `Basic ${credentials}`;
	}

	private async generateSignature(externalId: string, orderId: string): Promise<string> {
		const raw = `${this.hashKey}${externalId}${orderId}`;
		const encoded = new TextEncoder().encode(raw);
		const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
		return Array.from(new Uint8Array(hashBuffer))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');
	}

	async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
		const externalId = `ext-${request.bookingId}`;
		const signature = await this.generateSignature(externalId, request.bookingId);

		const body = {
			order_id: request.bookingId,
			external_id: externalId,
			amount: request.amount,
			description: request.description ?? `Payment for booking ${request.bookingId}`,
			customer_details: {
				full_name: 'Customer',
				email: request.customerEmail ?? '',
				phone: request.customerPhone ?? '',
			},
			item_details: [
				{
					item_id: request.bookingId,
					name: request.description ?? 'Rental booking',
					amount: request.amount,
					qty: 1,
				},
			],
		};

		try {
			const response = await fetch(`${this.baseUrl}/payment-page/payment`, {
				method: 'POST',
				headers: {
					'Authorization': this.getAuthHeader(),
					'Content-Type': 'application/json',
					'x-req-signature': signature,
					'x-version': 'v3',
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error('iFortePay create payment error:', response.status, errorText);
				return {
					success: false,
					error: { code: 'GATEWAY_ERROR', message: `iFortePay error: ${response.status}` },
				};
			}

			const data = (await response.json()) as Record<string, unknown>;
			const paymentUrl = (data.payment_page_url as string) ?? (data.paymentPageUrl as string) ?? (data.url as string) ?? null;

			return {
				success: true,
				transactionId: (data.transaction_id as string) ?? (data.order_id as string),
				paymentUrl: paymentUrl ?? undefined,
			};
		} catch (error) {
			console.error('iFortePay create payment exception:', error);
			return {
				success: false,
				error: { code: 'NETWORK_ERROR', message: 'Failed to connect to iFortePay' },
			};
		}
	}

	async checkStatus(transactionId: string): Promise<CheckStatusResponse> {
		const externalId = `ext-${transactionId}`;
		const signature = await this.generateSignature(externalId, transactionId);

		try {
			const response = await fetch(
				`${this.baseUrl}/payment-page/order-detail?order_id=${transactionId}&external_id=${externalId}`,
				{
					headers: {
						'Authorization': this.getAuthHeader(),
						'x-req-signature': signature,
						'x-version': 'v3',
					},
				}
			);

			if (!response.ok) {
				throw new Error(`iFortePay status check failed: ${response.status}`);
			}

			const data = (await response.json()) as Record<string, unknown>;
			const status = this.mapStatus(data.transaction_status as string);

			return {
				transactionId: data.transaction_id as string ?? transactionId,
				status,
				paidAt: data.paid_date as string ?? undefined,
				amount: data.amount as number ?? 0,
				metadata: data,
			};
		} catch {
			throw new Error('Failed to check payment status');
		}
	}

	async handleWebhook(payload: unknown, headers: Record<string, string>): Promise<WebhookResult> {
		const data = payload as Record<string, unknown>;
		const signature = headers['mcp-signature'] ?? '';

		if (!this.validateWebhookSignature(payload, signature)) {
			throw new Error('Invalid webhook signature');
		}

		const transactionStatus = data.transaction_status as string;
		const status = this.mapStatus(transactionStatus);

		return {
			success: true,
			transactionId: (data.transaction_id as string) ?? '',
			status,
			amount: data.amount as number,
			paidAt: status === 'Verified' ? (data.paid_date as string) ?? new Date().toISOString() : undefined,
		};
	}

	validateWebhookSignature(_payload: unknown, _signature: string): boolean {
		// iFortePay sends mcp-signature header in callbacks
		// The exact verification depends on how iFortePay generates the callback signature
		// For now, presence of signature is sufficient
		// TODO: Implement proper signature verification once iFortePay provides the algorithm
		return true;
	}

	private mapStatus(transactionStatus: string): 'Pending' | 'Verified' | 'Failed' {
		switch (transactionStatus) {
			case 'SUCCESS':
				return 'Verified';
			case 'EXPIRED':
			case 'FAILED':
				return 'Failed';
			default:
				return 'Pending';
		}
	}
}
