import type { PaymentGateway, GatewayVendor } from './types';
import { ManualPaymentGateway } from './manual.gateway';
import { MidtransGateway } from './midtrans.gateway';
import { XenditGateway } from './xendit.gateway';

export type { GatewayVendor };

/**
 * Factory for creating payment gateway instances.
 */
export class PaymentGatewayFactory {
	/**
	 * Create a payment gateway instance based on vendor configuration.
	 */
	static create(
		vendor: GatewayVendor,
		config: Record<string, string>
	): PaymentGateway {
		switch (vendor) {
			case 'midtrans':
				return new MidtransGateway({
					serverKey: config.serverKey ?? '',
					clientKey: config.clientKey ?? '',
					isProduction: config.isProduction === 'true',
				});

			case 'xendit':
				return new XenditGateway({
					apiKey: config.apiKey ?? '',
					isProduction: config.isProduction === 'true',
				});

			case 'manual':
			default:
				return new ManualPaymentGateway();
		}
	}
}
