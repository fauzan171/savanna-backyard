import type { WhatsAppProvider } from './providers';

export type CustomerNotificationChannel = 'web' | 'whatsapp';

export interface CustomerNotificationRepository {
	createNotification(data: {
		publicUserId: string | null;
		phone: string | null;
		type: string;
		title: string;
		message: string;
		metadata: string | null;
		readAt: string | null;
	}): Promise<unknown>;
}

export class CustomerNotificationService {
	constructor(
		private repo: CustomerNotificationRepository,
		private whatsapp: WhatsAppProvider,
		private channel: CustomerNotificationChannel,
	) {}

	async sendCustomerNotification(input: {
		publicUserId?: string | null;
		phone?: string | null;
		type: string;
		title: string;
		message: string;
		metadata?: Record<string, unknown>;
	}): Promise<void> {
		if (this.channel === 'web') {
			await this.repo.createNotification({
				publicUserId: input.publicUserId ?? null,
				phone: input.phone ?? null,
				type: input.type,
				title: input.title,
				message: input.message,
				metadata: input.metadata ? JSON.stringify(input.metadata) : null,
				readAt: null,
			});
			return;
		}

		if (!input.phone) return;
		const result = await this.whatsapp.sendMessage(input.phone, input.message);
		if (!result.success) {
			console.error('[customer-notification] WhatsApp send failed:', result.error);
		}
	}
}
