import jwt from '@tsndr/cloudflare-worker-jwt';
import type { JwtPayload } from '../types';

export class JwtService {
	constructor(private secret: string) {}

	async sign(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiresInDays = 7): Promise<string> {
		const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * expiresInDays;

		return await jwt.sign(
			{
				...payload,
				exp,
			},
			this.secret
		);
	}

	async verify(token: string): Promise<boolean> {
		const result = await jwt.verify(token, this.secret);
		return result !== undefined;
	}

	decode(token: string): { payload: JwtPayload } | null {
		try {
			return jwt.decode(token) as { payload: JwtPayload };
		} catch {
			return null;
		}
	}
}
