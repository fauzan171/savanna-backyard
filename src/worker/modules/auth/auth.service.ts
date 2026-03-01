import { UserRepository } from './auth.repository';
import { JwtService } from '@/worker/core/services/jwt.service';
import { UnauthorizedError } from '@/worker/core/types/errors';
import type { AuthUser } from './auth.types';
import type { LoginRequest } from './auth.dto';

// Password verification using Web Crypto API (for Cloudflare Workers)
// Using PBKDF2 with SHA-256
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
	try {
		const encoder = new TextEncoder();
		const data = encoder.encode(password);

		// Decode stored hash
		const combined = Uint8Array.from(atob(storedHash), (c) => c.charCodeAt(0));

		// Extract salt and stored hash
		const salt = combined.slice(0, 16);
		const storedKey = combined.slice(16);

		// Import password as key
		const keyMaterial = await crypto.subtle.importKey(
			'raw',
			data,
			'PBKDF2',
			false,
			['deriveBits']
		);

		// Derive bits using same parameters
		const derivedBits = await crypto.subtle.deriveBits(
			{
				name: 'PBKDF2',
				salt,
				iterations: 100000,
				hash: 'SHA-256',
			},
			keyMaterial,
			256
		);

		// Compare using constant-time comparison to prevent timing attacks
		const derivedKey = new Uint8Array(derivedBits);
		if (derivedKey.length !== storedKey.length) return false;

		// Constant-time comparison using XOR
		let result = 0;
		for (let i = 0; i < derivedKey.length; i++) {
			result |= derivedKey[i] ^ storedKey[i];
		}
		return result === 0;
	} catch {
		return false;
	}
}

export class AuthService {
	constructor(
		private userRepo: UserRepository,
		private jwtService: JwtService
	) {}

	async login(credentials: LoginRequest): Promise<{ user: AuthUser; token: string }> {
		const user = await this.userRepo.findByEmail(credentials.email);

		if (!user) {
			throw new UnauthorizedError('Invalid credentials');
		}

		const isValidPassword = await verifyPassword(credentials.password, user.passwordHash);
		if (!isValidPassword) {
			throw new UnauthorizedError('Invalid credentials');
		}

		if (!user.isActive) {
			throw new UnauthorizedError('Account is deactivated');
		}

		const { token } = await this.jwtService.sign({
			userId: user.id,
			role: user.role,
		});

		return {
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
			token,
		};
	}

	async me(userId: string): Promise<AuthUser> {
		const user = await this.userRepo.findById(userId);
		if (!user) {
			throw new UnauthorizedError('User not found');
		}

		return {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
		};
	}
}
