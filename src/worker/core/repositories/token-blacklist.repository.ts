import { eq, and, gt, lte } from 'drizzle-orm';
import { tokenBlacklist, type TokenBlacklistEntry, type NewTokenBlacklistEntry } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';

export class TokenBlacklistRepository {
	constructor(private db: Database) {}

	/**
	 * Add a token to the blacklist
	 * @param jti - Unique JWT ID
	 * @param userId - User who owned the token
	 * @param tokenHash - SHA-256 hash of the token
	 * @param expiresAt - When the token expires
	 */
	async add(data: Omit<NewTokenBlacklistEntry, 'id' | 'createdAt'>): Promise<TokenBlacklistEntry> {
		const id = crypto.randomUUID();
		await this.db.insert(tokenBlacklist).values({
			id,
			...data,
			createdAt: new Date().toISOString(),
		});
		const entry = await this.findById(id);
		if (!entry) {
			throw new Error('Failed to add token to blacklist');
		}
		return entry;
	}

	/**
	 * Check if a token is blacklisted by its hash
	 */
	async isBlacklisted(tokenHash: string): Promise<boolean> {
		const now = new Date().toISOString();
		const result = await this.db
			.select()
			.from(tokenBlacklist)
			.where(
				and(
					eq(tokenBlacklist.tokenHash, tokenHash),
					gt(tokenBlacklist.expiresAt, now)
				)
			)
			.limit(1);
		return result.length > 0;
	}

	/**
	 * Check if a JTI is blacklisted
	 */
	async isJtiBlacklisted(jti: string): Promise<boolean> {
		const now = new Date().toISOString();
		const result = await this.db
			.select()
			.from(tokenBlacklist)
			.where(
				and(
					eq(tokenBlacklist.jti, jti),
					gt(tokenBlacklist.expiresAt, now)
				)
			)
			.limit(1);
		return result.length > 0;
	}

	/**
	 * Find blacklist entry by ID
	 */
	async findById(id: string): Promise<TokenBlacklistEntry | null> {
		const result = await this.db
			.select()
			.from(tokenBlacklist)
			.where(eq(tokenBlacklist.id, id))
			.limit(1);
		return result[0] ?? null;
	}

	/**
	 * Clean up expired tokens from the blacklist
	 * Should be called periodically (e.g., via cron job)
	 */
	async cleanupExpired(): Promise<number> {
		const now = new Date().toISOString();
		// C6: was `gt` (deleted still-valid entries, kept expired ones) — inverted.
		// Now correctly deletes entries whose expiry has passed.
		const result = await this.db
			.delete(tokenBlacklist)
			.where(lte(tokenBlacklist.expiresAt, now));
		return (result as unknown as { changes?: number }).changes ?? 0;
	}
}
