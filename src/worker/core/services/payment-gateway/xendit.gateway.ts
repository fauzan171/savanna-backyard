import type {
	PaymentGateway,
	CreatePaymentRequest,
	CreatePaymentResponse,
	CheckStatusResponse,
	WebhookResult,
	GatewayVendor,
} from './types';

interface XenditConfig {
	apiKey: string;
	/** Webhook verification token from Xendit dashboard (Settings > Callbacks). */
	webhookToken?: string;
	isProduction: boolean;
}

/**
 * Shape of a Xendit Invoice object returned by the API.
 * Reference: https://developers.xendit.co/api-reference/#invoices
 */
interface XenditInvoice {
	id: string;
	external_id: string;
	status: string; // PENDING | PAID | EXPIRED | SETTLED
	amount: number;
	paid_amount?: number;
	invoice_url?: string;
	expiry_date?: string;
	paid_at?: string;
	payment_method?: string;
	payment_channel?: string;
	failure_code?: string;
}

/**
 * Xendit payment gateway integration using the Invoice API.
 *
 * Flow:
 *  1. createPayment() -> POST /payment_requests -> returns invoice_url (paymentPageUrl)
 *  2. Customer pays via Xendit-hosted page (QRIS, VA, e-wallet, CC, retail)
 *  3. Xendit sends webhook -> handleWebhook() verifies X-CALLBACK-TOKEN
 *  4. checkStatus() -> GET /payment_requests/{id} for manual status polling
 *
 * Auth: Basic Auth with Base64(apiKey:) — same as Midtrans pattern.
 *
 * Docs: https://developers.xendit.co/api-reference/#invoices
 */
export class XenditGateway implements PaymentGateway {
	readonly name: GatewayVendor = 'xendit';
	private apiKey: string;
	private webhookToken: string;
	private baseUrl: string;

	constructor(config: XenditConfig) {
		this.apiKey = config.apiKey;
		this.webhookToken = config.webhookToken ?? '';
		// Xendit uses the same API host for test & live; the API key prefix
		// (xnd_development_ vs xnd_production_) determines the mode.
		this.baseUrl = 'https://api.xendit.co';
	}

	private getAuthHeader(): string {
		return `Basic ${btoa(`${this.apiKey}:`)}`;
	}

	/**
	 * Create a Xendit Invoice.
	 * Returns invoice_url which the customer is redirected to for payment.
	 */
	async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
		if (!this.apiKey) {
			return {
				success: false,
				error: { code: 'CONFIG_ERROR', message: 'Xendit API key not configured' },
			};
		}

		const externalId = request.bookingId;
		const body = {
			external_id: externalId,
			amount: request.amount,
			currency: request.currency === 'USD' ? 'USD' : 'IDR',
			description: request.description ?? `Payment for booking ${request.bookingId}`,
			invoice_duration: 86400, // 24 hours
			customer: {
				email: request.customerEmail ?? undefined,
				mobile_number: request.customerPhone ?? undefined,
			},
			success_redirect_url: undefined,
			failure_redirect_url: undefined,
			payment_methods: this.resolvePaymentMethods(request.method),
		};

		try {
			const response = await fetch(`${this.baseUrl}/payment_requests`, {
				method: 'POST',
				headers: {
					'Authorization': this.getAuthHeader(),
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error('Xendit create invoice error:', response.status, errorText);
				return {
					success: false,
					error: { code: 'GATEWAY_ERROR', message: `Xendit error: ${response.status}` },
				};
			}

			const data = (await response.json()) as Record<string, unknown>;
			const actions = data.actions as Array<{ url: string }> | undefined;
			const invoiceUrl =
				(data.invoice_url as string) ??
				(actions?.find((a) => a.url?.includes('invoice'))?.url) ??
				null;

			return {
				success: true,
				transactionId: (data.id as string) ?? externalId,
				paymentUrl: invoiceUrl ?? undefined,
				expiresAt: (data.expiry_date as string) ?? undefined,
			};
		} catch (error) {
			console.error('Xendit create invoice exception:', error);
			return {
				success: false,
				error: { code: 'NETWORK_ERROR', message: 'Failed to connect to Xendit' },
			};
		}
	}

	/**
	 * Check invoice status via Xendit API.
	 * GET /payment_requests/{id}
	 */
	async checkStatus(invoiceId: string): Promise<CheckStatusResponse> {
		if (!this.apiKey) {
			throw new Error('Xendit API key not configured');
		}

		try {
			const response = await fetch(`${this.baseUrl}/payment_requests/${invoiceId}`, {
				headers: {
					'Authorization': this.getAuthHeader(),
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error('Xendit status check error:', response.status, errorText);
				throw new Error(`Xendit status check failed: ${response.status}`);
			}

			const data = (await response.json()) as XenditInvoice;
			const status = this.mapInvoiceStatus(data.status);

			return {
				transactionId: data.id ?? invoiceId,
				status,
				paidAt: status === 'Verified' ? (data.paid_at ?? undefined) : undefined,
				amount: data.paid_amount ?? data.amount,
				metadata: data as unknown as Record<string, unknown>,
			};
		} catch (error) {
			if (error instanceof Error) throw error;
			throw new Error('Failed to check Xendit payment status');
		}
	}

	/**
	 * Handle webhook notification from Xendit.
	 * Verifies the X-CALLBACK-TOKEN header against the configured webhook token.
	 *
	 * Docs: https://developers.xendit.co/api-reference/#webhooks
	 */
	async handleWebhook(payload: unknown, headers: Record<string, string>): Promise<WebhookResult> {
		if (!this.validateWebhookSignature(payload, headers['x-callback-token'] ?? '')) {
			throw new Error('Invalid Xendit webhook signature');
		}

		const data = payload as Record<string, unknown>;
		const status = this.mapInvoiceStatus(data.status as string);

		return {
			success: true,
			transactionId: (data.id as string) ?? (data.external_id as string) ?? '',
			status,
			amount: (data.paid_amount as number) ?? (data.amount as number) ?? 0,
			paidAt: status === 'Verified' ? (data.paid_at as string) ?? new Date().toISOString() : undefined,
		};
	}

	/**
	 * Validate webhook signature.
	 * Xendit uses a static verification token sent in the X-CALLBACK-TOKEN header.
	 * We compare it against the token configured in the dashboard.
	 */
	validateWebhookSignature(_payload: unknown, signature: string): boolean {
		if (!this.webhookToken) return false;
		return signature === this.webhookToken;
	}

	/**
	 * Map Xendit invoice status to internal PaymentStatus.
	 *
	 * Reference: https://developers.xendit.co/api-reference/#invoices
	 */
	private mapInvoiceStatus(status: string): 'Pending' | 'Verified' | 'Failed' {
		switch (status) {
			case 'PAID':
			case 'SETTLED':
				return 'Verified';
			case 'PENDING':
			case 'REQUIRES_ACTION':
				return 'Pending';
			case 'EXPIRED':
			case 'FAILED':
			default:
				return 'Failed';
		}
	}

	/**
	 * Resolve Xendit payment method codes based on the requested PaymentMethod.
	 * This restricts the invoice to only show relevant payment channels.
	 *
	 * Reference: https://developers.xendit.co/api-reference/#create-invoice
	 */
	private resolvePaymentMethods(method: string): string[] | undefined {
		switch (method) {
			case 'QRIS':
				return ['QRIS'];
			case 'BankTransfer':
				return ['BCA', 'BNI', 'BRI', 'MANDIRI'];
			case 'Gateway':
				// Let Xendit show all available methods (e-wallet, CC, retail, etc.)
				return undefined;
			default:
				return undefined;
		}
	}
}
