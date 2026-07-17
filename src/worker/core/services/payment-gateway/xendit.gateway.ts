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
	 *
	 * API: POST https://api.xendit.co/v2/invoices
	 * Docs: https://developers.xendit.co/api-reference/#create-invoice
	 */
	async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
		if (!this.apiKey) {
			console.error('[Xendit] API key not configured');
			return {
				success: false,
				error: { code: 'CONFIG_ERROR', message: 'Xendit API key not configured' },
			};
		}

		const externalId = request.bookingId;
		const body: Record<string, unknown> = {
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

		// Down-payment support: one invoice for the full amount, allow_partial lets the
		// customer pay at least `minimum_amount` (the DP). They reopen the same invoice
		// to pay the remainder — no second invoice needed.
		if (request.allowPartial) {
			body.allow_partial = true;
			if (request.minimumAmount && request.minimumAmount > 0) {
				body.minimum_amount = request.minimumAmount;
			}
		}

		console.log('[Xendit] Creating invoice:', { externalId, amount: request.amount, method: request.method });

		try {
			const response = await fetch(`${this.baseUrl}/v2/invoices`, {
				method: 'POST',
				headers: {
					'Authorization': this.getAuthHeader(),
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error('[Xendit] Create invoice failed:', response.status, errorText);
				return {
					success: false,
					error: { code: 'GATEWAY_ERROR', message: `Xendit error: ${response.status} - ${errorText}` },
				};
			}

			const data = (await response.json()) as Record<string, unknown>;
			console.log('[Xendit] Invoice created:', { id: data.id, invoice_url: data.invoice_url, status: data.status });

			const invoiceUrl = (data.invoice_url as string) ?? null;

			// Extract QR string for inline QRIS rendering
			// Xendit only returns qr_code when payment_method includes QRIS
			const qrCode = data.qr_code as { qr_string?: string } | undefined;
			const qrString = qrCode?.qr_string ?? undefined;
			if (!qrString) {
				console.log('[Xendit] No qr_string in response. qr_code field:', data.qr_code ?? 'absent');
			}

			return {
				success: true,
				transactionId: (data.id as string) ?? externalId,
				paymentUrl: invoiceUrl ?? undefined,
				qrString,
				expiresAt: (data.expiry_date as string) ?? undefined,
			};
		} catch (error) {
			console.error('[Xendit] Create invoice exception:', error);
			return {
				success: false,
				error: { code: 'NETWORK_ERROR', message: `Failed to connect to Xendit: ${error}` },
			};
		}
	}

	/**
	 * Check invoice status via Xendit API.
	 * GET /v2/invoices/{invoice_id}
	 */
	async checkStatus(invoiceId: string): Promise<CheckStatusResponse> {
		if (!this.apiKey) {
			throw new Error('Xendit API key not configured');
		}

		try {
			const response = await fetch(`${this.baseUrl}/v2/invoices/${invoiceId}`, {
				headers: {
					'Authorization': this.getAuthHeader(),
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error('[Xendit] Status check error:', response.status, errorText);
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
