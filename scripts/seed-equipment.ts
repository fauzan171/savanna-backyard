import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { equipment } from '../src/worker/core/database/schema';
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

async function seedEquipment() {
	console.log('🌱 Seeding equipment...\n');
	const dbPath = getLocalDbPath();
	console.log(`📦 Database path: ${dbPath}`);
	const sqlite = new Database(dbPath);
	const db = drizzle(sqlite, { schema: { equipment } });

	const now = new Date().toISOString();
	const items = [
		{ name: 'Helm Full Face', category: 'Safety' as const, description: 'Helm full face SNI, ukuran M/L/XL', dailyRateIdr: 50000, stock: 10, sortOrder: 1 },
		{ name: 'Helm Open Face', category: 'Safety' as const, description: 'Helm open face untuk street bike', dailyRateIdr: 40000, stock: 8, sortOrder: 2 },
		{ name: 'Jersey Motor', category: 'Apparel' as const, description: 'Jersey riding bersumbing udara', dailyRateIdr: 35000, stock: 12, sortOrder: 3 },
		{ name: 'Celana Riding', category: 'Apparel' as const, description: 'Celana riding dengan pelindung lutut', dailyRateIdr: 40000, stock: 10, sortOrder: 4 },
		{ name: 'Sarung Tangan', category: 'Apparel' as const, description: 'Gloves riding full finger', dailyRateIdr: 20000, stock: 15, sortOrder: 5 },
		{ name: 'Sepatu Boot', category: 'Apparel' as const, description: 'Boot riding pelindung pergelangan kaki', dailyRateIdr: 60000, stock: 6, sortOrder: 6 },
		{ name: 'Body Armor', category: 'Safety' as const, description: 'Pelindung dada & punggung', dailyRateIdr: 50000, stock: 5, sortOrder: 7 },
		{ name: 'Jas Hujan', category: 'Apparel' as const, description: 'Raincoat dua potong anti rembes', dailyRateIdr: 25000, stock: 8, sortOrder: 8 },
		{ name: 'Holder HP/GPS', category: 'Accessories' as const, description: 'Phone/GPS mount untuk handlebar', dailyRateIdr: 15000, stock: 10, sortOrder: 9 },
		{ name: 'Mount Action Camera', category: 'Electronics' as const, description: 'Bracket mount untuk GoPro/Action Cam', dailyRateIdr: 20000, stock: 6, sortOrder: 10 },
	];

	const rows = items.map((it) => ({
		id: crypto.randomUUID(),
		name: it.name,
		category: it.category,
		description: it.description,
		dailyRateIdr: it.dailyRateIdr,
		image: null,
		stock: it.stock,
		isActive: true,
		minRentalDays: 1,
		sortOrder: it.sortOrder,
		createdAt: now,
		updatedAt: now,
	}));

	await db.insert(equipment).values(rows).run();
	console.log(`✅ Seeded ${rows.length} equipment items`);
	sqlite.close();
}

seedEquipment().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
