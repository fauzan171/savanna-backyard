import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { inArray } from 'drizzle-orm';
import { systemConfiguration } from '../src/worker/core/database/schema';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

function getLocalDbPath(): string {
	const projectRoot = path.resolve(process.cwd());
	const d1Dir = path.join(projectRoot, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
	try {
		const files = fs.readdirSync(d1Dir);
		const dbFile = files.find((f: string) => f.endsWith('.sqlite'));
		if (dbFile) return path.join(d1Dir, dbFile);
	} catch {
		// fall through
	}
	throw new Error('Local D1 database not found. Run "npm run dev" first to initialize the database.');
}

async function seedPenaltyConfig() {
	console.log('🌱 Seeding penalty config...\n');
	const dbPath = getLocalDbPath();
	console.log(`📦 Database path: ${dbPath}`);
	const sqlite = new Database(dbPath);
	const db = drizzle(sqlite, { schema: { systemConfiguration } });

	const now = new Date().toISOString();
	const entries = [
		{ key: 'damage_per_item', value: '50000', description: 'Denda kerusakan per item checklist (IDR, flat rate)' },
		{ key: 'late_fee_multiplier', value: '1.5', description: 'Pengali denda keterlambatan (× daily rate per hari)' },
		{ key: 'max_late_fee_per_day', value: '0', description: 'Cap denda keterlambatan per hari (0 = tanpa cap)' },
	];

	// Idempotent: remove existing rows for these keys, then insert fresh.
	const keys = entries.map((e) => e.key);
	db.delete(systemConfiguration).where(inArray(systemConfiguration.key, keys)).run();

	const rows = entries.map((e) => ({
		id: crypto.randomUUID(),
		key: e.key,
		value: e.value,
		description: e.description,
		updatedAt: now,
		updatedBy: null,
	}));

	db.insert(systemConfiguration).values(rows).run();

	console.log(`✅ Seeded ${rows.length} penalty config keys:`);
	for (const e of entries) {
		console.log(`   • ${e.key} = ${e.value}`);
	}
	console.log('\nDone.');
	sqlite.close();
}

seedPenaltyConfig().catch((err) => {
	console.error('❌ Failed to seed penalty config:', err);
	process.exit(1);
});
