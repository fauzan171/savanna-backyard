import { ConfigRepository } from '../../repositories/config.repository';
import { StubWhatsAppProvider, FonnteWhatsAppProvider, type WhatsAppProvider } from './whatsapp.provider';

/** Build the WhatsApp provider from settings; defaults to the stub (dev) when unset. */
export async function createWhatsAppProvider(configRepo: ConfigRepository): Promise<WhatsAppProvider> {
	const provider = (await configRepo.getValue('whatsapp_provider')) ?? 'stub';
	if (provider === 'fonnte') {
		const apiKey = (await configRepo.getValue('whatsapp_api_key')) ?? '';
		const sender = (await configRepo.getValue('whatsapp_sender')) ?? undefined;
		return new FonnteWhatsAppProvider(apiKey, sender);
	}
	return new StubWhatsAppProvider();
}

export type { WhatsAppProvider, WhatsAppSendResult } from './whatsapp.provider';
