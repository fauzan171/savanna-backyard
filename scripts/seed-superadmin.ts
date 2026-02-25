import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { users } from '../src/worker/core/database/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// PBKDF2 password hashing (matching auth.service.ts)
function hashPassword(password: string): string {
	const salt = crypto.randomBytes(16);
	const iterations = 100000;
	const keylen = 32; // 256 bits

	const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keylen, 'sha256');

	// Combine salt + derived key, then base64 encode
	const combined = Buffer.concat([salt, derivedKey]);
	return combined.toString('base64');
}

// Generate a secure random password
function generatePassword(length = 16): string {
	const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
	const randomBytes = crypto.randomBytes(length);
	let password = '';

	for (let i = 0; i < length; i++) {
		password += charset[randomBytes[i] % charset.length];
	}

	return password;
}

// Find local D1 database path
function getLocalDbPath(): string {
	// Wrangler stores local D1 in .wrangler/state/v3/d1/miniflare-D1DatabaseObject/
	const projectRoot = path.resolve(process.cwd());
	const d1Dir = path.join(projectRoot, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');

	try {
		const files = fs.readdirSync(d1Dir);
		const dbFile = files.find((f: string) => f.endsWith('.sqlite'));
		if (dbFile) {
			return path.join(d1Dir, dbFile);
		}
	} catch {
		// Directory doesn't exist
	}

	throw new Error(
		'Local D1 database not found. Run "npm run dev" first to initialize the database.'
	);
}

async function seedSuperAdmin() {
	console.log('🌱 Seeding super admin...\n');

	const dbPath = getLocalDbPath();
	console.log(`📦 Database path: ${dbPath}`);

	const sqlite = new Database(dbPath);
	const db = drizzle(sqlite, { schema: { users } });

	const superAdminId = 'admin-00000000-0000-0000-0000-000000000001';
	const email = 'admin@savanna.local';
	const password = generatePassword(16);

	// Check if superadmin already exists
	const existing = await db.select().from(users).where(eq(users.id, superAdminId));

	if (existing.length > 0) {
		console.log('⚠️  Super admin already exists, updating password...\n');
		await db.update(users)
			.set({ passwordHash: hashPassword(password) })
			.where(eq(users.id, superAdminId));
		console.log('✅ Super admin password updated\n');
	} else {
		// Create superadmin
		await db.insert(users).values({
			id: superAdminId,
			name: 'Super Admin',
			email,
			passwordHash: hashPassword(password),
			role: 'SUPER_ADMIN',
			isActive: true,
		});
		console.log('✅ Super admin created\n');
	}

	console.log('═══════════════════════════════════════════════════');
	console.log('📋 SUPER ADMIN CREDENTIALS');
	console.log('═══════════════════════════════════════════════════');
	console.log(`   Email:    ${email}`);
	console.log(`   Password: ${password}`);
	console.log('═══════════════════════════════════════════════════');
	console.log('\n⚠️  Please save these credentials securely!\n');

	sqlite.close();
}

seedSuperAdmin().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
