import { eq, and, or, gte, lte, lt, gt, like, sql, asc, inArray, not } from 'drizzle-orm';
import { vehicles, bookings, customers, packages, pricingTiers, reviews, trails, equipment, bookingEquipment, type Vehicle, type Booking, type NewBooking, type Customer, type NewCustomer, type Package, type PricingTier, type Review, type Trail, type Equipment, type NewBookingEquipment } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';

export class PublicApiRepository {
	constructor(private db: Database) {}

	// Vehicle operations
	async getAvailableVehicles(type?: string): Promise<Vehicle[]> {
		const conditions = [eq(vehicles.status, 'Available')];
		if (type) {
			conditions.push(eq(vehicles.type, type as Vehicle['type']));
		}
		return this.db.select().from(vehicles).where(and(...conditions));
	}

	async getActiveVehicles(): Promise<Vehicle[]> {
		return this.db.select().from(vehicles).where(eq(vehicles.status, 'Available'));
	}

	async getVehicleById(id: string): Promise<Vehicle | null> {
		const result = await this.db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
		return result[0] ?? null;
	}

	/** Get vehicle by QR code value (SVN:{vehicleId}) — for public scan */
	async getVehicleByCode(code: string): Promise<Vehicle | null> {
		// Strip SVN: prefix if present
		const vehicleId = code.startsWith('SVN:') ? code.slice(4) : code;
		if (!vehicleId) return null;
		return this.getVehicleById(vehicleId);
	}

	// Check if vehicle is available for date range (no conflicting bookings)
	async isVehicleAvailableForDates(vehicleId: string, startDate: string, endDate: string, excludeBookingId?: string): Promise<boolean> {
		// B1: exclusive overlap (lt/gt) so back-to-back bookings (one returns on
		// day N, another starts on day N) don't conflict — matching the admin
		// bookings.repository.findConflictingBookings convention.
		const conditions = [
			eq(bookings.vehicleId, vehicleId),
			inArray(bookings.status, ['Pending', 'pending_payment', 'Confirmed', 'Active']),
			lt(bookings.startDate, endDate),
			gt(bookings.endDate, startDate),
		];
		if (excludeBookingId) {
			conditions.push(not(eq(bookings.id, excludeBookingId)));
		}
		const conflicts = await this.db
			.select()
			.from(bookings)
			.where(and(...conditions))
			.limit(1);
		return conflicts.length === 0;
	}

	// B3: equipment stock operations (atomic conditional update)
	async decrementEquipmentStock(equipmentId: string, qty: number): Promise<boolean> {
		const result = await this.db
			.update(equipment)
			.set({ stock: sql`${equipment.stock} - ${qty}` })
			.where(and(eq(equipment.id, equipmentId), gte(equipment.stock, qty)));
		return (result as unknown as { rowsAffected?: number }).rowsAffected !== 0;
	}

	async restoreEquipmentStock(equipmentId: string, qty: number): Promise<void> {
		await this.db
			.update(equipment)
			.set({ stock: sql`${equipment.stock} + ${qty}` })
			.where(eq(equipment.id, equipmentId));
	}

	// Customer operations
	async findCustomerByPhone(phone: string): Promise<Customer | null> {
		const result = await this.db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
		return result[0] ?? null;
	}

	async createCustomer(data: Omit<NewCustomer, 'id'>): Promise<Customer> {
		const id = crypto.randomUUID();
		await this.db.insert(customers).values({ id, ...data });
		const customer = await this.db.select().from(customers).where(eq(customers.id, id)).limit(1);
		return customer[0]!;
	}

	// Booking number generation: SVN-YYYY-NNNN
	async generateBookingNumber(): Promise<string> {
		const year = new Date().getFullYear().toString();
		const prefix = `SVN-${year}-`;

		const result = await this.db
			.select({ bookingNumber: bookings.bookingNumber })
			.from(bookings)
			.where(like(bookings.bookingNumber, `${prefix}%`))
			.orderBy(sql`${bookings.bookingNumber} DESC`)
			.limit(1);

		let next = 1;
		if (result.length > 0) {
			const lastNumber = result[0]!.bookingNumber;
			const numPart = lastNumber.split('-')[2];
			if (numPart) {
				next = parseInt(numPart, 10) + 1;
			}
		}

		return `${prefix}${next.toString().padStart(4, '0')}`;
	}

	// Booking operations
	async createBooking(data: Omit<NewBooking, 'id' | 'bookingNumber'>): Promise<Booking> {
		const id = crypto.randomUUID();
		const bookingNumber = await this.generateBookingNumber();
		await this.db.insert(bookings).values({ id, bookingNumber, ...data });
		const booking = await this.db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
		return booking[0]!;
	}

	async updateBooking(id: string, data: Partial<NewBooking>): Promise<void> {
		await this.db.update(bookings).set(data).where(eq(bookings.id, id));
	}

	async findBookingByNumber(bookingNumber: string): Promise<Booking | null> {
		const result = await this.db.select().from(bookings).where(eq(bookings.bookingNumber, bookingNumber)).limit(1);
		return result[0] ?? null;
	}

	// Fase 2: Content queries
	async getPublicVehicles(): Promise<Vehicle[]> {
		return this.db.select().from(vehicles).where(eq(vehicles.status, 'Available'));
	}

	async getActivePackages(): Promise<Package[]> {
		return this.db.select().from(packages)
			.where(eq(packages.isActive, true))
			.orderBy(asc(packages.sortOrder));
	}

	async getActivePricingTiers(): Promise<PricingTier[]> {
		return this.db.select().from(pricingTiers)
			.where(eq(pricingTiers.isActive, true))
			.orderBy(asc(pricingTiers.sortOrder));
	}

	async getPublishedReviews(limit: number = 10, offset: number = 0, rating?: number): Promise<{ reviews: Review[]; total: number; averageRating: number }> {
		const conditions = [eq(reviews.isPublished, true)];
		if (rating) {
			conditions.push(eq(reviews.rating, rating));
		}

		const result = await this.db.select().from(reviews)
			.where(and(...conditions))
			.orderBy(sql`${reviews.createdAt} DESC`)
			.limit(limit)
			.offset(offset);

		const countResult = await this.db.select({ count: sql<number>`count(*)` }).from(reviews)
			.where(and(...conditions));

		const avgResult = await this.db.select({ avg: sql<number>`COALESCE(AVG(CAST(${reviews.rating} AS REAL)), 0)` }).from(reviews)
			.where(eq(reviews.isPublished, true));

		return {
			reviews: result,
			total: countResult[0]?.count ?? 0,
			averageRating: Math.round((avgResult[0]?.avg ?? 0) * 10) / 10,
		};
	}

	async getActiveTrails(): Promise<Trail[]> {
		return this.db.select().from(trails)
			.where(eq(trails.isActive, true))
			.orderBy(asc(trails.sortOrder));
	}

	async getTrailById(id: string): Promise<Trail | null> {
		const result = await this.db.select().from(trails).where(eq(trails.id, id)).limit(1);
		return result[0] ?? null;
	}

	// ---- Equipment ----
	async getActiveEquipment(): Promise<Equipment[]> {
		return this.db.select().from(equipment).where(eq(equipment.isActive, true)).orderBy(asc(equipment.sortOrder), asc(equipment.name));
	}

	async getEquipmentById(id: string): Promise<Equipment | null> {
		const [row] = await this.db.select().from(equipment).where(eq(equipment.id, id)).limit(1);
		return row ?? null;
	}

	/** Fetch multiple active equipment items by id (for booking line items). */
	async getActiveEquipmentByIds(ids: string[]): Promise<Equipment[]> {
		if (ids.length === 0) return [];
		return this.db.select().from(equipment).where(and(inArray(equipment.id, ids), eq(equipment.isActive, true)));
	}

	/** Insert equipment line items for a booking (unit price snapshotted at booking time). */
	async createBookingEquipment(rows: Array<Omit<NewBookingEquipment, 'id' | 'createdAt'>>): Promise<void> {
		if (rows.length === 0) return;
		const now = new Date().toISOString();
		const withIds = rows.map((r) => ({ id: crypto.randomUUID(), createdAt: now, ...r }));
		await this.db.insert(bookingEquipment).values(withIds);
	}

	/** Active bookings for a vehicle overlapping [startDate, endDate] (used for the availability calendar). */
	async getVehicleBookingsInRange(vehicleId: string, startDate: string, endDate: string): Promise<Booking[]> {
		return this.db
			.select()
			.from(bookings)
			.where(
				and(
					eq(bookings.vehicleId, vehicleId),
					or(
						eq(bookings.status, 'Pending'),
						eq(bookings.status, 'pending_payment'),
						eq(bookings.status, 'Confirmed'),
						eq(bookings.status, 'Active'),
					),
					lte(bookings.startDate, endDate),
					gte(bookings.endDate, startDate),
				),
			);
	}
}
