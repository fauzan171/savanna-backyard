// Payment Gateway Types

export type PaymentMethod = 'QRIS' | 'Gateway' | 'BankTransfer' | 'Cash';
export type PaymentStatus = 'Pending' | 'Verified' | 'Failed';
export type GatewayVendor = 'midtrans' | 'xendit' | 'manual' | 'ifortepay';

// Request to create a payment
export interface CreatePaymentRequest {
	amount: number;
	currency: 'IDR' | 'USD';
	method: PaymentMethod;
	bookingId: string;
	customerEmail?: string;
	customerPhone?: string;
	description?: string;
}

// Response from creating a payment
export interface CreatePaymentResponse {
	success: boolean;
	transactionId?: string;
	paymentUrl?: string;        // For gateway redirects
	qrCodeUrl?: string;         // For QRIS
	vaNumber?: string;          // For virtual account
	expiresAt?: string;
	error?: {
		code: string;
		message: string;
	};
}

// Response from checking payment status
export interface CheckStatusResponse {
	transactionId: string;
	status: PaymentStatus;
	paidAt?: string;
	amount?: number;
	metadata?: Record<string, unknown>;
}

// Result from processing a webhook
export interface WebhookResult {
	success: boolean;
	transactionId: string;
	status: PaymentStatus;
	amount: number;
	paidAt?: string;
}

// Payment Gateway Interface
export interface PaymentGateway {
	readonly name: GatewayVendor;

	// Create a payment request
	createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse>;

	// Check payment status
	checkStatus(transactionId: string): Promise<CheckStatusResponse>;

	// Handle webhook callback (gateway-specific)
	handleWebhook(payload: unknown, headers: Record<string, string>): Promise<WebhookResult>;

	// Validate webhook signature
	validateWebhookSignature(payload: unknown, signature: string): boolean;
}
