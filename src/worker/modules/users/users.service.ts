import { UsersRepository } from './users.repository';
import { NotFoundError, ConflictError, UnauthorizedError } from '@/worker/core/types/errors';

// Password hashing using Web Crypto API (PBKDF2-SHA256)
async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
	const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
	const combined = new Uint8Array(salt.length + derivedBits.byteLength);
	combined.set(salt, 0);
	combined.set(new Uint8Array(derivedBits), salt.length);
	return btoa(String.fromCharCode(...combined));
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
	try {
		const encoder = new TextEncoder();
		const combined = Uint8Array.from(atob(storedHash), (c) => c.charCodeAt(0));
		const salt = combined.slice(0, 16);
		const storedKey = combined.slice(16);
		const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
		const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
		const derivedKey = new Uint8Array(derivedBits);
		if (storedKey.length !== derivedKey.length) return false;
		return storedKey.every((byte, i) => byte === derivedKey[i]);
	} catch {
		return false;
	}
}

export class UsersService {
	constructor(private repo: UsersRepository) {}

	async list() {
		const userList = await this.repo.list();
		return userList.map(({ passwordHash, ...rest }) => rest);
	}

	async getById(id: string) {
		const user = await this.repo.getById(id);
		if (!user) throw new NotFoundError('User');
		const { passwordHash, ...rest } = user;
		return rest;
	}

	async create(data: { name: string; email: string; password: string; role?: string; isActive?: boolean }) {
		const existing = await this.repo.getByEmail(data.email);
		if (existing) throw new ConflictError('Email already exists');

		const passwordHash = await hashPassword(data.password);
		const now = new Date().toISOString();
		const user = await this.repo.create({
			name: data.name,
			email: data.email,
			passwordHash,
			role: (data.role as 'SUPER_ADMIN' | 'STAFF') ?? 'STAFF',
			isActive: data.isActive ?? true,
			createdAt: now,
			updatedAt: now,
		});

		const { passwordHash: _, ...rest } = user;
		return rest;
	}

	async update(id: string, data: { name?: string; email?: string; role?: string; isActive?: boolean }) {
		const target = await this.getById(id);

		if (data.email) {
			const existing = await this.repo.getByEmail(data.email);
			if (existing && existing.id !== id) throw new ConflictError('Email already exists');
		}

		// BUG#2 guard: block demoting/deactivating the last SUPER_ADMIN.
		if (target.role === 'SUPER_ADMIN') {
			const wouldDemote = data.role !== undefined && data.role !== 'SUPER_ADMIN';
			const wouldDeactivate = data.isActive === false;
			if (wouldDemote || wouldDeactivate) {
				const count = await this.repo.countActiveSuperAdmins();
				if (count <= 1) {
					throw new ConflictError(
						'Cannot demote or deactivate the last active SUPER_ADMIN. Promote another admin first.',
					);
				}
			}
		}

		const user = await this.repo.update(id, {
			...data,
			role: data.role as 'SUPER_ADMIN' | 'STAFF' | undefined,
		});

		const { passwordHash, ...rest } = user;
		return rest;
	}

	async toggle(id: string) {
		const user = await this.repo.getById(id);
		if (!user) throw new NotFoundError('User');

		// BUG#2 guard: block deactivating the last SUPER_ADMIN.
		if (user.role === 'SUPER_ADMIN' && user.isActive) {
			const count = await this.repo.countActiveSuperAdmins();
			if (count <= 1) {
				throw new ConflictError(
					'Cannot deactivate the last active SUPER_ADMIN. Promote another admin first.',
				);
			}
		}

		const updated = await this.repo.update(id, { isActive: !user.isActive });
		const { passwordHash, ...rest } = updated;
		return rest;
	}

	async changePassword(id: string, currentPassword: string, newPassword: string) {
		const user = await this.repo.getById(id);
		if (!user) throw new NotFoundError('User');

		const isValid = await verifyPassword(currentPassword, user.passwordHash);
		if (!isValid) throw new UnauthorizedError('Current password is incorrect');

		const passwordHash = await hashPassword(newPassword);
		await this.repo.update(id, { passwordHash });
		return { success: true };
	}

	/**
	 * BUG#11: admin password reset (no current-password required). Resolves the
	 * contradiction where the route granted admins the right to change others'
	 * passwords but the service required the current password (which the admin
	 * doesn't know). This is a SUPER_ADMIN-only operation, separate from the
	 * self-service changePassword.
	 */
	async adminResetPassword(id: string, newPassword: string) {
		const user = await this.repo.getById(id);
		if (!user) throw new NotFoundError('User');

		const passwordHash = await hashPassword(newPassword);
		await this.repo.update(id, { passwordHash });
		return { success: true };
	}
}
