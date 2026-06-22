/**
 * Google OAuth provider — verifies a Google ID token and extracts the user identity.
 *
 * The default implementation validates the token via Google's public tokeninfo
 * endpoint. When `google_oauth_client_id` is configured, the audience (`aud`) is
 * checked; when it's empty (dev), the aud check is skipped but the tokeninfo still
 * must return a valid `sub` + `email`.
 *
 * Tests/dev inject a fake implementation of `GoogleOAuthProvider` instead.
 */
export interface GoogleUserInfo {
	googleId: string;
	email: string;
	name: string;
	avatarUrl: string | null;
}

export interface GoogleOAuthProvider {
	verifyIdToken(idToken: string): Promise<GoogleUserInfo>;
}

interface GoogleTokenInfo {
	sub: string;
	email: string;
	email_verified?: string;
	name?: string;
	picture?: string;
	aud?: string;
}

export class TokenInfoGoogleProvider implements GoogleOAuthProvider {
	constructor(private clientId: string) {}

	async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
		const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
		if (!res.ok) {
			throw new Error(`Google tokeninfo request failed: ${res.status}`);
		}
		const info = (await res.json()) as GoogleTokenInfo;
		if (!info.sub || !info.email) {
			throw new Error('Google token is missing identity claims');
		}
		// Validate audience only when a client id is configured
		if (this.clientId && info.aud !== this.clientId) {
			throw new Error('Google token audience does not match configured client id');
		}
		return {
			googleId: info.sub,
			email: info.email,
			name: info.name ?? info.email.split('@')[0]!,
			avatarUrl: info.picture ?? null,
		};
	}
}
