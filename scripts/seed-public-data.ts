import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { vehicles, packages, pricingTiers, reviews, trails } from '../src/worker/core/database/schema';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

function getLocalDbPath(): string {
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

const now = new Date().toISOString();

async function seedPublicData() {
	console.log('🌱 Seeding public data...\n');

	const dbPath = getLocalDbPath();
	console.log(`📦 Database path: ${dbPath}`);

	const sqlite = new Database(dbPath);
	const db = drizzle(sqlite, { schema: { vehicles, packages, pricingTiers, reviews, trails } });

	// ===== VEHICLES (6) =====
	console.log('\n🚗 Seeding vehicles...');
	const vehiclesData = [
		{
			id: crypto.randomUUID(),
			name: 'Honda CRF 150L',
			plateNumber: 'B 1234 SV',
			type: 'TrailBike' as const,
			brand: 'Honda',
			model: 'CRF 150L',
			year: 2024,
			category: '150cc Trail',
			specs: JSON.stringify({ engine: '149.15 cc', power: '12.4 HP', weight: '122 kg', seat: '865 mm' }),
			description: 'A real Indonesian dual-sport favorite. Lightweight, reliable, and perfectly suited for Bromo\'s volcanic sand terrain.',
			dailyRateIdr: 200000,
			status: 'Available' as const,
			photoUrl: '/images/bike_crf150.jpg',
		},
		{
			id: crypto.randomUUID(),
			name: 'Honda CRF 250L',
			plateNumber: 'B 5678 SV',
			type: 'TrailBike' as const,
			brand: 'Honda',
			model: 'CRF 250L',
			year: 2024,
			category: '250cc Trail',
			specs: JSON.stringify({ engine: '249.6 cc', power: '24.4 HP', weight: '153 kg', seat: '875 mm' }),
			description: 'More power for experienced riders who want to tackle Bromo\'s challenging trails with confidence.',
			dailyRateIdr: 350000,
			status: 'Available' as const,
			photoUrl: '/images/bike_crf250.jpg',
		},
		{
			id: crypto.randomUUID(),
			name: 'Kawasaki KLX 150',
			plateNumber: 'B 9012 SV',
			type: 'TrailBike' as const,
			brand: 'Kawasaki',
			model: 'KLX 150',
			year: 2024,
			category: '150cc Trail',
			specs: JSON.stringify({ engine: '144 cc', power: '11.5 HP', weight: '114 kg', seat: '830 mm' }),
			description: 'Lightweight and nimble, the KLX 150 is perfect for beginners exploring Bromo for the first time.',
			dailyRateIdr: 200000,
			status: 'Available' as const,
			photoUrl: '/images/bike_klx150.jpg',
		},
		{
			id: crypto.randomUUID(),
			name: 'Kawasaki KLX 250',
			plateNumber: 'B 3456 SV',
			type: 'TrailBike' as const,
			brand: 'Kawasaki',
			model: 'KLX 250',
			year: 2024,
			category: '250cc Trail',
			specs: JSON.stringify({ engine: '249 cc', power: '23.2 HP', weight: '138 kg', seat: '855 mm' }),
			description: 'A capable dual-sport machine that handles both on-road and off-road terrain with ease.',
			dailyRateIdr: 350000,
			status: 'Available' as const,
			photoUrl: '/images/bike_klx250.jpg',
		},
		{
			id: crypto.randomUUID(),
			name: 'Yamaha NMAX',
			plateNumber: 'B 7890 SV',
			type: 'StreetBike' as const,
			brand: 'Yamaha',
			model: 'NMAX',
			year: 2024,
			category: '155cc Scooter',
			specs: JSON.stringify({ engine: '155 cc', power: '15.4 HP', weight: '131 kg', seat: '765 mm' }),
			description: 'Comfortable scooter for city riding and easy trips around the Bromo area.',
			dailyRateIdr: 150000,
			status: 'Available' as const,
			photoUrl: '/images/bike_nmax.jpg',
		},
		{
			id: crypto.randomUUID(),
			name: 'Toyota Avanza',
			plateNumber: 'B 2345 SV',
			type: 'Car' as const,
			brand: 'Toyota',
			model: 'Avanza',
			year: 2024,
			category: 'MPV',
			specs: JSON.stringify({ engine: '1496 cc', power: '104 HP', weight: '1155 kg', seat: '5 seats' }),
			description: 'Spacious family car perfect for group trips to Bromo with comfort and reliability.',
			dailyRateIdr: 400000,
			status: 'Available' as const,
			photoUrl: '/images/car_avanza.jpg',
		},
	];

	for (const v of vehiclesData) {
		await db.insert(vehicles).values(v).onConflictDoNothing();
	}
	console.log(`  ✅ ${vehiclesData.length} vehicles seeded`);

	// ===== PACKAGES (4) =====
	console.log('\n📦 Seeding packages...');
	const packagesData = [
		{
			id: crypto.randomUUID(),
			name: 'Self-Ride Day',
			tagline: 'Bike, helmet, route map.',
			description: 'A clean trail bike, basic gear, and a mapped Bromo route. You ride solo, at your own pace, with 24/7 phone support if needed.',
			image: '/images/package_sunrise.jpg',
			duration: '1 day',
			distance: 'Flexible',
			groupSize: '1-2 riders',
			price: 180000,
			trailId: 'sea-of-sand',
			sortOrder: 0,
			isActive: true,
		},
		{
			id: crypto.randomUUID(),
			name: 'Guided Sunrise Tour',
			tagline: 'Guided sunrise, breakfast included.',
			description: 'An expert local guide leads you to Bromo\'s famous sunrise viewpoint, then across the Sea of Sand. Breakfast at a local warung included.',
			image: '/images/package_guided.jpg',
			duration: '1 day',
			distance: '60 km',
			groupSize: '2-6 riders',
			price: 350000,
			trailId: 'sea-of-sand',
			sortOrder: 1,
			isActive: true,
		},
		{
			id: crypto.randomUUID(),
			name: 'Multi-Day Adventure',
			tagline: '3 days, 2 nights, full support.',
			description: 'Explore Bromo, the Whispering Savanna, and hidden waterfalls over 3 days. Accommodation, meals, and full mechanical support included.',
			image: '/images/package_adventure.jpg',
			duration: '3 days',
			distance: '200 km',
			groupSize: '4-8 riders',
			price: 750000,
			trailId: 'whispering-savanna',
			sortOrder: 2,
			isActive: true,
		},
		{
			id: crypto.randomUUID(),
			name: 'Custom Bromo Trip',
			tagline: 'Tell us your dream trip.',
			description: 'Have something specific in mind? We\'ll build a custom itinerary just for you — routes, duration, group size, all flexible.',
			image: '/images/package_custom.jpg',
			duration: 'Flexible',
			distance: 'Custom',
			groupSize: 'Any',
			price: 0,
			trailId: null,
			sortOrder: 3,
			isActive: true,
		},
	];

	for (const p of packagesData) {
		await db.insert(packages).values(p).onConflictDoNothing();
	}
	console.log(`  ✅ ${packagesData.length} packages seeded`);

	// ===== PRICING TIERS (3) =====
	console.log('\n💰 Seeding pricing tiers...');
	const pricingData = [
		{
			id: crypto.randomUUID(),
			name: 'Ride Only',
			description: 'For the independent rider',
			dailyPrice: 150000,
			multiDayPrice: 120000,
			features: JSON.stringify(['Motorcycle rental', 'Standard helmet', 'Basic insurance', '24/7 roadside support']),
			notIncluded: JSON.stringify(['Riding gear', 'Raincoat', 'Phone holder', 'Route guide']),
			highlighted: false,
			icon: 'Bike',
			sortOrder: 0,
			isActive: true,
		},
		{
			id: crypto.randomUUID(),
			name: 'Ride + Guide',
			description: 'The most popular choice',
			dailyPrice: 250000,
			multiDayPrice: 200000,
			features: JSON.stringify(['Motorcycle rental', 'Full riding gear', 'Insurance included', 'Local route guide', 'Breakfast & water', 'Photo spots tour']),
			notIncluded: JSON.stringify(['Hotel pickup', 'Lunch/dinner']),
			highlighted: true,
			icon: 'Compass',
			sortOrder: 1,
			isActive: true,
		},
		{
			id: crypto.randomUUID(),
			name: 'Full Package',
			description: 'All-inclusive adventure',
			dailyPrice: 400000,
			multiDayPrice: 350000,
			features: JSON.stringify(['Premium motorcycle', 'Full riding gear', 'Comprehensive insurance', 'Expert guide', 'All meals included', 'Hotel pickup & drop-off', 'Souvenir photo pack']),
			notIncluded: JSON.stringify([]),
			highlighted: false,
			icon: 'Crown',
			sortOrder: 2,
			isActive: true,
		},
	];

	for (const p of pricingData) {
		await db.insert(pricingTiers).values(p).onConflictDoNothing();
	}
	console.log(`  ✅ ${pricingData.length} pricing tiers seeded`);

	// ===== REVIEWS (5) =====
	console.log('\n⭐ Seeding reviews...');
	const reviewsData = [
		{
			id: crypto.randomUUID(),
			name: 'Ahmad Rizki',
			location: 'Jakarta',
			rating: 5,
			text: 'Motor bersih, pelayanan ramah, rutenya jelas. Pengalaman pertama naik trail di Bromo dan sangat memuaskan!',
			avatar: 'AR',
			isPublished: true,
		},
		{
			id: crypto.randomUUID(),
			name: 'Sarah Chen',
			location: 'Singapore',
			rating: 5,
			text: 'Amazing experience! The bike was in perfect condition and the guide knew all the best spots. Will definitely come back.',
			avatar: 'SC',
			isPublished: true,
		},
		{
			id: crypto.randomUUID(),
			name: 'Budi Santoso',
			location: 'Surabaya',
			rating: 4,
			text: 'Trailnya seru, tapi agak menantang buat pemula. Untung guide-nya sabar dan sangat membantu. Recommended!',
			avatar: 'BS',
			isPublished: true,
		},
		{
			id: crypto.randomUUID(),
			name: 'Lisa Wijaya',
			location: 'Bandung',
			rating: 5,
			text: 'Sewa motor trail terbaik di Bromo! Harga reasonable, motor terawat, dan tim-nya super helpful.',
			avatar: 'LW',
			isPublished: true,
		},
		{
			id: crypto.randomUUID(),
			name: 'Tom Miller',
			location: 'Australia',
			rating: 4,
			text: 'Great value for money. The KLX 150 was perfect for the terrain. Just wish there were more trail options.',
			avatar: 'TM',
			isPublished: true,
		},
	];

	for (const r of reviewsData) {
		await db.insert(reviews).values(r).onConflictDoNothing();
	}
	console.log(`  ✅ ${reviewsData.length} reviews seeded`);

	// ===== TRAILS (3) =====
	console.log('\n🗺️ Seeding trails...');
	const trailsData = [
		{
			id: 'sea-of-sand',
			name: 'Sea of Sand Loop',
			description: 'The classic Bromo crossing through volcanic sand dunes.',
			terrain: 'Volcanic Sand, Gravel',
			elevation: '2,100m - 2,329m',
			difficulty: 'Moderate',
			recommended: 'CRF 150L / KLX 150',
			image: '/images/dayride_bike_landscape.jpg',
			mapImage: '/images/map_sea_of_sand.png',
			blogOverview: 'The Sea of Sand is Bromo\'s most iconic landscape — a vast, otherworldly plain of volcanic sand stretching between the caldera walls. This loop takes you across the sandy basin, up to the crater rim, and back through local village trails.\n\nThe terrain is mostly soft sand with some gravel sections, making it perfect for trail bikes. The total loop covers about 25km and takes 2-3 hours at a comfortable pace.',
			blogTips: '- Start early (4-5 AM) for sunrise views from the crater rim\n- Carry extra water — there are no shops on the trail\n- Lower your tire pressure slightly for better sand traction\n- Wear a dust mask or bandana over your nose and mouth\n- The sand can be deep in some sections — maintain momentum',
			blogGallery: JSON.stringify(['/images/trail/sea_1.jpg', '/images/trail/sea_2.jpg', '/images/trail/sea_3.jpg']),
			gpxUrl: '/gpx/sea_of_sand.gpx',
			estimatedDuration: '2-3 hours',
			distance: '25 km',
			bestTime: 'Dry season (April - October)',
			sortOrder: 0,
			isActive: true,
		},
		{
			id: 'whispering-savanna',
			name: 'Whispering Savanna',
			description: 'Gentle rolling hills with stunning views of the caldera.',
			terrain: 'Grassland, Dirt Track',
			elevation: '2,000m - 2,200m',
			difficulty: 'Easy',
			recommended: 'Any trail bike',
			image: '/images/trail_savanna.jpg',
			mapImage: '/images/map_whispering_savanna.png',
			blogOverview: 'The Whispering Savanna is a peaceful ride through Bromo\'s highland meadows. Unlike the dramatic sand dunes, this trail offers gentle rolling hills covered in tussock grass, with panoramic views of the Tengger caldera.\n\nPerfect for beginners or those who want a relaxed ride with spectacular scenery. The trail is mostly firm dirt with some grassy sections.',
			blogTips: '- Great for beginners — very forgiving terrain\n- Best during golden hour (early morning or late afternoon)\n- Watch out for grazing horses and cattle\n- Bring a camera — the views are incredible\n- Can be combined with Sea of Sand for a longer ride',
			blogGallery: JSON.stringify(['/images/trail/savanna_1.jpg', '/images/trail/savanna_2.jpg']),
			gpxUrl: '/gpx/whispering_savanna.gpx',
			estimatedDuration: '1-2 hours',
			distance: '15 km',
			bestTime: 'Year-round (best in dry season)',
			sortOrder: 1,
			isActive: true,
		},
		{
			id: 'caldera-rim',
			name: 'Caldera Rim Trail',
			description: 'Challenging ride along the volcanic caldera edge.',
			terrain: 'Rocky, Steep inclines, Volcanic ash',
			elevation: '2,200m - 2,700m',
			difficulty: 'Hard',
			recommended: 'CRF 250L / KLX 250',
			image: '/images/trail_caldera.jpg',
			mapImage: '/images/map_caldera_rim.png',
			blogOverview: 'The Caldera Rim Trail is not for the faint of heart. This advanced route follows the edge of the ancient Tengger caldera, with steep climbs, rocky sections, and narrow paths along cliff edges.\n\nThe reward? Unparalleled views of the entire Bromo-Tengger-Semeru National Park, from the smoking crater of Semeru to the distant Indian Ocean on clear days.',
			blogTips: '- NOT for beginners — requires confident off-road skills\n- Use a 250cc bike or larger for the steep climbs\n- Start early to avoid afternoon clouds obscuring views\n- Bring warm clothing — it gets cold at 2,700m\n- Never ride alone on this trail\n- Check weather conditions before departing',
			blogGallery: JSON.stringify(['/images/trail/caldera_1.jpg', '/images/trail/caldera_2.jpg', '/images/trail/caldera_3.jpg']),
			gpxUrl: '/gpx/caldera_rim.gpx',
			estimatedDuration: '4-5 hours',
			distance: '40 km',
			bestTime: 'Dry season only (June - September)',
			sortOrder: 2,
			isActive: true,
		},
	];

	for (const t of trailsData) {
		await db.insert(trails).values(t).onConflictDoNothing();
	}
	console.log(`  ✅ ${trailsData.length} trails seeded`);

	console.log('\n═══════════════════════════════════════════════════');
	console.log('✅ PUBLIC DATA SEEDING COMPLETE');
	console.log('═══════════════════════════════════════════════════');
	console.log(`  Vehicles:      ${vehiclesData.length}`);
	console.log(`  Packages:      ${packagesData.length}`);
	console.log(`  Pricing Tiers: ${pricingData.length}`);
	console.log(`  Reviews:       ${reviewsData.length}`);
	console.log(`  Trails:        ${trailsData.length}`);
	console.log('═══════════════════════════════════════════════════\n');

	sqlite.close();
}

seedPublicData().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
