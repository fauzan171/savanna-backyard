/**
 * Pluggable WhatsApp provider for the inbound OTP flow and (later) notifications.
 *
 * - `StubWhatsAppProvider`: default for dev/test — logs messages so the OTP flow runs
 *   end-to-end without a WhatsApp Business account (read the OTP from the console).
 * - `FonnteWhatsAppProvider`: Indonesian WhatsApp API — enable via `whatsapp_provider=fonnte`.
 *
 * Tests inject a fake that captures sent messages.
 */
export interface WhatsAppSendResult {
	success: boolean;
	error?: string;
}

export interface WhatsAppProvider {
	readonly name: string;
	/** Send a text message to a number (digits only or with leading +). */
	sendMessage(to: string, text: string): Promise<WhatsAppSendResult>;
}

export class StubWhatsAppProvider implements WhatsAppProvider {
	readonly name = 'stub';
	async sendMessage(to: string, text: string): Promise<WhatsAppSendResult> {
		console.log(`[WhatsApp stub] to=${to} text=${text}`);
		return { success: true };
	}
}

/**
 * Fonnte WhatsApp API adapter (https://api.fonnte.com).
 * Requires a Fonnte API token + a device/sender. Enable by setting
 * `whatsapp_provider=fonnte`, `whatsapp_api_key`, `whatsapp_sender` in settings.
 */
export class FonnteWhatsAppProvider implements WhatsAppProvider {
	readonly name = 'fonnte';
	constructor(private apiKey: string, private sender?: string) {}

	async sendMessage(to: string, text: string): Promise<WhatsAppSendResult> {
		if (!this.apiKey) {
			return { success: false, error: 'Fonnte API key not configured' };
		}
		try {
			const body: Record<string, unknown> = { target: to, message: text };
			if (this.sender) body.device = this.sender;
			const res = await fetch('https://api.fonnte.com/send', {
				method: 'POST',
				headers: { Authorization: this.apiKey, 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				return { success: false, error: `Fonnte HTTP ${res.status}` };
			}
			const data = (await res.json()) as { status?: boolean; reason?: string };
			if (data.status === false) {
				return { success: false, error: data.reason ?? 'Fonnte rejected the message' };
			}
			return { success: true };
		} catch (e) {
			return { success: false, error: e instanceof Error ? e.message : String(e) };
		}
	}
}
