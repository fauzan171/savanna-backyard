/**
 * Idempotent schema bootstrap for columns that orphaned migrations left out.
 *
 * SQLite has no `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, so this script
 * checks PRAGMA table_info before each ALTER. Safe to re-run.
 *
 * Local usage:   npx tsx scripts/ensure-schema.ts
 * Remote usage:  not supported (run the equivalent ALTERs via wrangler d1
 *                execute --remote, guarding each with PRAGMA checks).
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

function findLocalDb(): string {
	const dir = path.resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
	const files = fs.readdirSync(dir);
	const dbFile = files.find((f) => f.endsWith('.sqlite'));
	if (!dbFile) throw new Error('Local D1 database not found. Run `npm run dev` first.');
	return path.join(dir, dbFile);
}

type AlterSpec = { table: string; column: string; definition: string };

// Columns added by the orphaned 0003_public_api_overhaul.sql + 0004_add_payment_page_url.sql
const ALTERS: AlterSpec[] = [
	// vehicles
	{ table: 'vehicles', column: 'category', definition: 'TEXT' },
	{ table: 'vehicles', column: 'specs', definition: 'TEXT' },
	{ table: 'vehicles', column: 'description', definition: 'TEXT' },
	// bookings (payment overhaul)
	{ table: 'bookings', column: 'payment_status', definition: 'TEXT' },
	{ table: 'bookings', column: 'payment_method', definition: 'TEXT' },
	{ table: 'bookings', column: 'snap_token', definition: 'TEXT' },
	{ table: 'bookings', column: 'paid_at', definition: 'TEXT' },
	{ table: 'bookings', column: 'payment_page_url', definition: 'TEXT' },
	// leads
	{ table: 'leads', column: 'preferred_start', definition: 'TEXT' },
	{ table: 'leads', column: 'preferred_end', definition: 'TEXT' },
	{ table: 'leads', column: 'vehicle_interest', definition: 'TEXT' },
];

function columnExists(db: Database.Database, table: string, column: string): boolean {
	const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
	return rows.some((r) => r.name === column);
}

function tableExists(db: Database.Database, table: string): boolean {
	const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table) as
		| { name: string }
		| undefined;
	return !!row;
}

function main() {
	const dbPath = findLocalDb();
	const db = new Database(dbPath);

	let applied = 0;
	let skipped = 0;

	for (const { table, column, definition } of ALTERS) {
		if (!tableExists(db, table)) {
			console.log(`⚠️  Table ${table} does not exist — skipping ${column}`);
			skipped++;
			continue;
		}
		if (columnExists(db, table, column)) {
			skipped++;
			continue;
		}
		try {
			db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
			console.log(`✅ Added ${table}.${column}`);
			applied++;
		} catch (e) {
			console.error(`❌ Failed to add ${table}.${column}:`, (e as Error).message);
		}
	}

	console.log(`\nDone: ${applied} added, ${skipped} already present/missing-table.`);
	db.close();
}

main();
