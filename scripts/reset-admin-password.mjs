/**
 * Resets the local super-admin password to a known value for automated testing.
 * Uses the same PBKDF2 hashing as seed-superadmin.ts / auth.service.ts.
 *
 * Usage: node scripts/reset-admin-password.mjs
 */
import crypto from 'crypto';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

function findLocalDb() {
	const dir = path.resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
	const files = fs.readdirSync(dir);
	const dbFile = files.find((f) => f.endsWith('.sqlite'));
	if (!dbFile) throw new Error('Local D1 database not found');
	return path.join(dir, dbFile);
}

function hashPassword(password) {
	const salt = crypto.randomBytes(16);
	const iterations = 100000;
	const keylen = 32;
	const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keylen, 'sha256');
	return Buffer.concat([salt, derivedKey]).toString('base64');
}

const dbPath = findLocalDb();
const db = new Database(dbPath);
const newPassword = 'admin123';
const hash = hashPassword(newPassword);

db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, 'admin@savanna.local');
const count = db.prepare('SELECT COUNT(*) as n FROM users WHERE email = ?').get('admin@savanna.local');

console.log(`✅ Password reset for admin@savanna.local → "${newPassword}" (matched ${count.n} row)`);
db.close();
