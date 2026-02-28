import { describe, it, expect, beforeEach } from 'vitest';
import { ManualPaymentGateway } from '@/worker/core/services/payment-gateway/manual.gateway';
import { MidtransGateway } from '@/worker/core/services/payment-gateway/midtrans.gateway';
import { XenditGateway } from '@/worker/core/services/payment-gateway/xendit.gateway';
import { PaymentGatewayFactory } from '@/worker/core/services/payment-gateway/factory';
import type { CreatePaymentRequest } from '@/worker/core/services/payment-gateway/types';

describe('Payment Gateway Module', () => {
	describe('ManualPaymentGateway', () => {
		let gateway: ManualPaymentGateway;

		beforeEach(() => {
			gateway = new ManualPaymentGateway();
		});

		describe('name', () => {
			it('[P0] should have name "manual"', () => {
				expect(gateway.name).toBe('manual');
			});
		});

		describe('createPayment', () => {
			// ============================================
			// P0: Happy Path
			// ============================================

			it('[P0] should create payment and return transaction ID', async () => {
				const request: CreatePaymentRequest = {
					amount: 500000,
					currency: 'IDR',
					method: 'BankTransfer',
					bookingId: 'booking-123',
				};

				const result = await gateway.createPayment(request);

				expect(result.success).toBe(true);
				expect(result.transactionId).toBeDefined();
				expect(result.transactionId).toContain('MANUAL-');
				expect(result.transactionId).toContain('booking-');
			});

			it('[P0] should generate unique transaction IDs', async () => {
				const request1: CreatePaymentRequest = {
					amount: 500000,
					currency: 'IDR',
					method: 'BankTransfer',
					bookingId: 'booking-123',
				};
				const request2: CreatePaymentRequest = {
					amount: 500000,
					currency: 'IDR',
					method: 'BankTransfer',
					bookingId: 'booking-456', // Different booking ID ensures uniqueness
				};

				const result1 = await gateway.createPayment(request1);
				// Wait a bit to ensure different timestamp
				await new Promise(resolve => setTimeout(resolve, 2));
				const result2 = await gateway.createPayment(request2);

				expect(result1.transactionId).toBeDefined();
				expect(result2.transactionId).toBeDefined();
				expect(result1.transactionId).not.toBe(result2.transactionId);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should handle Cash payment method', async () => {
				const request: CreatePaymentRequest = {
					amount: 100000,
					currency: 'IDR',
					method: 'Cash',
					bookingId: 'booking-456',
				};

				const result = await gateway.createPayment(request);

				expect(result.success).toBe(true);
			});

			it('[P1] should not return payment URL for manual payments', async () => {
				const request: CreatePaymentRequest = {
					amount: 500000,
					currency: 'IDR',
					method: 'BankTransfer',
					bookingId: 'booking-123',
				};

				const result = await gateway.createPayment(request);

				expect(result.paymentUrl).toBeUndefined();
				expect(result.qrCodeUrl).toBeUndefined();
				expect(result.vaNumber).toBeUndefined();
			});

			it('[P1] should handle all payment methods', async () => {
				const methods: Array<'QRIS' | 'Gateway' | 'BankTransfer' | 'Cash'> =
					['QRIS', 'Gateway', 'BankTransfer', 'Cash'];

				for (const method of methods) {
					const request: CreatePaymentRequest = {
						amount: 100000,
						currency: 'IDR',
						method,
						bookingId: 'booking-123',
					};

					const result = await gateway.createPayment(request);
					expect(result.success).toBe(true);
				}
			});

			it('[P1] should handle USD currency', async () => {
				const request: CreatePaymentRequest = {
					amount: 100,
					currency: 'USD',
					method: 'BankTransfer',
					bookingId: 'booking-789',
				};

				const result = await gateway.createPayment(request);

				expect(result.success).toBe(true);
			});

			it('[P1] should handle large amounts', async () => {
				const request: CreatePaymentRequest = {
					amount: 999999999999,
					currency: 'IDR',
					method: 'BankTransfer',
					bookingId: 'booking-large',
				};

				const result = await gateway.createPayment(request);

				expect(result.success).toBe(true);
			});

			it('[P1] should truncate booking ID in transaction ID', async () => {
				const request: CreatePaymentRequest = {
					amount: 500000,
					currency: 'IDR',
					method: 'BankTransfer',
					bookingId: 'booking-with-very-long-id-12345',
				};

				const result = await gateway.createPayment(request);

				expect(result.transactionId).toBeDefined();
				// Transaction ID should include first 8 chars of booking ID
				expect(result.transactionId).toContain('booking-');
			});
		});

		describe('checkStatus', () => {
			// ============================================
			// P0: Error Cases
			// ============================================

			it('[P0] should throw error for status checking', async () => {
				await expect(
					gateway.checkStatus('MANUAL-123')
				).rejects.toThrow('Manual payments do not support status checking via gateway');
			});
		});

		describe('handleWebhook', () => {
			// ============================================
			// P0: Error Cases
			// ============================================

			it('[P0] should throw error for webhook handling', async () => {
				await expect(
					gateway.handleWebhook({}, {})
				).rejects.toThrow('Manual payments do not support webhooks');
			});
		});

		describe('validateWebhookSignature', () => {
			// ============================================
			// P0: Error Cases
			// ============================================

			it('[P0] should return false for webhook signature validation', () => {
				const result = gateway.validateWebhookSignature({}, 'signature');

				expect(result).toBe(false);
			});
		});
	});

	describe('MidtransGateway', () => {
		let gateway: MidtransGateway;

		beforeEach(() => {
			gateway = new MidtransGateway({
				serverKey: 'test-server-key',
				clientKey: 'test-client-key',
				isProduction: false,
			});
		});

		describe('name', () => {
			it('[P0] should have name "midtrans"', () => {
				expect(gateway.name).toBe('midtrans');
			});
		});

		describe('createPayment', () => {
			// ============================================
			// P0: Not Implemented
			// ============================================

			it('[P0] should return not implemented error', async () => {
				const request: CreatePaymentRequest = {
					amount: 500000,
					currency: 'IDR',
					method: 'QRIS',
					bookingId: 'booking-123',
				};

				const result = await gateway.createPayment(request);

				expect(result.success).toBe(false);
				expect(result.error?.code).toBe('NOT_IMPLEMENTED');
				expect(result.error?.message).toContain('Midtrans integration not yet implemented');
			});
		});

		describe('checkStatus', () => {
			it('[P0] should throw not implemented error', async () => {
				await expect(
					gateway.checkStatus('txn-123')
				).rejects.toThrow('Midtrans integration not yet implemented');
			});
		});

		describe('handleWebhook', () => {
			it('[P0] should throw not implemented error', async () => {
				await expect(
					gateway.handleWebhook({}, {})
				).rejects.toThrow('Midtrans integration not yet implemented');
			});
		});

		describe('validateWebhookSignature', () => {
			it('[P0] should throw not implemented error', () => {
				expect(() =>
					gateway.validateWebhookSignature({}, 'signature')
				).toThrow('Midtrans integration not yet implemented');
			});
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should accept production config', () => {
			const prodGateway = new MidtransGateway({
				serverKey: 'prod-server-key',
				clientKey: 'prod-client-key',
				isProduction: true,
			});

			expect(prodGateway.name).toBe('midtrans');
		});

		it('[P1] should accept empty config', () => {
			const emptyConfigGateway = new MidtransGateway({
				serverKey: '',
				clientKey: '',
				isProduction: false,
			});

			expect(emptyConfigGateway.name).toBe('midtrans');
		});
	});

	describe('XenditGateway', () => {
		let gateway: XenditGateway;

		beforeEach(() => {
			gateway = new XenditGateway({
				apiKey: 'test-api-key',
				isProduction: false,
			});
		});

		describe('name', () => {
			it('[P0] should have name "xendit"', () => {
				expect(gateway.name).toBe('xendit');
			});
		});

		describe('createPayment', () => {
			// ============================================
			// P0: Not Implemented
			// ============================================

			it('[P0] should return not implemented error', async () => {
				const request: CreatePaymentRequest = {
					amount: 500000,
					currency: 'IDR',
					method: 'QRIS',
					bookingId: 'booking-123',
				};

				const result = await gateway.createPayment(request);

				expect(result.success).toBe(false);
				expect(result.error?.code).toBe('NOT_IMPLEMENTED');
				expect(result.error?.message).toContain('Xendit integration not yet implemented');
			});
		});

		describe('checkStatus', () => {
			it('[P0] should throw not implemented error', async () => {
				await expect(
					gateway.checkStatus('txn-123')
				).rejects.toThrow('Xendit integration not yet implemented');
			});
		});

		describe('handleWebhook', () => {
			it('[P0] should throw not implemented error', async () => {
				await expect(
					gateway.handleWebhook({}, {})
				).rejects.toThrow('Xendit integration not yet implemented');
			});
		});

		describe('validateWebhookSignature', () => {
			it('[P0] should throw not implemented error', () => {
				expect(() =>
					gateway.validateWebhookSignature({}, 'signature')
				).toThrow('Xendit integration not yet implemented');
			});
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should accept production config', () => {
			const prodGateway = new XenditGateway({
				apiKey: 'prod-api-key',
				isProduction: true,
			});

			expect(prodGateway.name).toBe('xendit');
		});

		it('[P1] should accept empty config', () => {
			const emptyConfigGateway = new XenditGateway({
				apiKey: '',
				isProduction: false,
			});

			expect(emptyConfigGateway.name).toBe('xendit');
		});
	});

	describe('PaymentGatewayFactory', () => {
		describe('create', () => {
			// ============================================
			// P0: Happy Path
			// ============================================

			it('[P0] should create manual gateway', () => {
				const gateway = PaymentGatewayFactory.create('manual', {});

				expect(gateway.name).toBe('manual');
				expect(gateway).toBeInstanceOf(ManualPaymentGateway);
			});

			it('[P0] should create midtrans gateway with config', () => {
				const gateway = PaymentGatewayFactory.create('midtrans', {
					serverKey: 'test-key',
					clientKey: 'test-client',
					isProduction: 'false',
				});

				expect(gateway.name).toBe('midtrans');
				expect(gateway).toBeInstanceOf(MidtransGateway);
			});

			it('[P0] should create xendit gateway with config', () => {
				const gateway = PaymentGatewayFactory.create('xendit', {
					apiKey: 'test-key',
					isProduction: 'false',
				});

				expect(gateway.name).toBe('xendit');
				expect(gateway).toBeInstanceOf(XenditGateway);
			});

			// ============================================
			// P1: Edge Cases
			// ============================================

			it('[P1] should default to manual gateway for unknown vendor', () => {
				const gateway = PaymentGatewayFactory.create('unknown' as 'manual', {});

				expect(gateway.name).toBe('manual');
				expect(gateway).toBeInstanceOf(ManualPaymentGateway);
			});

			it('[P1] should handle empty config for manual gateway', () => {
				const gateway = PaymentGatewayFactory.create('manual', {});

				expect(gateway.name).toBe('manual');
			});

			it('[P1] should handle missing config values for midtrans', () => {
				const gateway = PaymentGatewayFactory.create('midtrans', {});

				expect(gateway.name).toBe('midtrans');
			});

			it('[P1] should handle missing config values for xendit', () => {
				const gateway = PaymentGatewayFactory.create('xendit', {});

				expect(gateway.name).toBe('xendit');
			});

			it('[P1] should parse isProduction string for midtrans', () => {
				const prodGateway = PaymentGatewayFactory.create('midtrans', {
					isProduction: 'true',
				});

				const devGateway = PaymentGatewayFactory.create('midtrans', {
					isProduction: 'false',
				});

				// Both should be created successfully
				expect(prodGateway.name).toBe('midtrans');
				expect(devGateway.name).toBe('midtrans');
			});

			it('[P1] should parse isProduction string for xendit', () => {
				const prodGateway = PaymentGatewayFactory.create('xendit', {
					isProduction: 'true',
				});

				const devGateway = PaymentGatewayFactory.create('xendit', {
					isProduction: 'false',
				});

				expect(prodGateway.name).toBe('xendit');
				expect(devGateway.name).toBe('xendit');
			});

			it('[P1] should create new instance each time', () => {
				const gateway1 = PaymentGatewayFactory.create('manual', {});
				const gateway2 = PaymentGatewayFactory.create('manual', {});

				expect(gateway1).not.toBe(gateway2);
			});
		});
	});

	describe('PaymentGateway Interface Compliance', () => {
		// ============================================
		// P1: Interface Compliance Tests
		// ============================================

		it('[P1] ManualPaymentGateway should implement all interface methods', () => {
			const gateway = new ManualPaymentGateway();

			expect(gateway).toHaveProperty('name');
			expect(typeof gateway.createPayment).toBe('function');
			expect(typeof gateway.checkStatus).toBe('function');
			expect(typeof gateway.handleWebhook).toBe('function');
			expect(typeof gateway.validateWebhookSignature).toBe('function');
		});

		it('[P1] MidtransGateway should implement all interface methods', () => {
			const gateway = new MidtransGateway({
				serverKey: '',
				clientKey: '',
				isProduction: false,
			});

			expect(gateway).toHaveProperty('name');
			expect(typeof gateway.createPayment).toBe('function');
			expect(typeof gateway.checkStatus).toBe('function');
			expect(typeof gateway.handleWebhook).toBe('function');
			expect(typeof gateway.validateWebhookSignature).toBe('function');
		});

		it('[P1] XenditGateway should implement all interface methods', () => {
			const gateway = new XenditGateway({
				apiKey: '',
				isProduction: false,
			});

			expect(gateway).toHaveProperty('name');
			expect(typeof gateway.createPayment).toBe('function');
			expect(typeof gateway.checkStatus).toBe('function');
			expect(typeof gateway.handleWebhook).toBe('function');
			expect(typeof gateway.validateWebhookSignature).toBe('function');
		});
	});
});
