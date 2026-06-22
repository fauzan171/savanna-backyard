import { ConfigRepository } from '../../repositories/config.repository';
import { TokenInfoGoogleProvider, type GoogleOAuthProvider } from './google-oauth.provider';
import { StubWhatsAppProvider, FonnteWhatsAppProvider, type WhatsAppProvider } from './whatsapp.provider';

/** Build the Google OAuth provider from settings (client id may be empty in dev). */
export async function createGoogleOAuthProvider(configRepo: ConfigRepository): Promise<GoogleOAuthProvider> {
	const clientId = (await configRepo.getValue('google_oauth_client_id')) ?? '';
	return new TokenInfoGoogleProvider(clientId);
}

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

export type { GoogleOAuthProvider, GoogleUserInfo } from './google-oauth.provider';
export type { WhatsAppProvider, WhatsAppSendResult } from './whatsapp.provider';
