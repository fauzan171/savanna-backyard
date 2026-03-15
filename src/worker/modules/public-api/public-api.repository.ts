import { eq, and, or, gte, lte } from 'drizzle-orm';
import { leads, vehicles, bookings, customers, type Lead, type Vehicle, type NewLead, type Booking, type NewBooking, type Customer, type NewCustomer } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';

export class PublicApiRepository {
	constructor(private db: Database) {}

	// Lead operations
	async createLead(data: Omit<NewLead, 'id'>): Promise<Lead> {
		const id = crypto.randomUUID();
		await this.db.insert(leads).values({ id, ...data });
		const lead = await this.db.select().from(leads).where(eq(leads.id, id)).limit(1);
		return lead[0]!;
	}

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

	// Check if vehicle is available for date range (no conflicting bookings)
	async isVehicleAvailableForDates(vehicleId: string, startDate: string, endDate: string): Promise<boolean> {
		const conflicts = await this.db
			.select()
			.from(bookings)
			.where(
				and(
					eq(bookings.vehicleId, vehicleId),
					or(
						eq(bookings.status, 'Pending'),
						eq(bookings.status, 'Confirmed'),
						eq(bookings.status, 'Active'),
					),
					// Overlapping date check: booking starts before endDate AND booking ends after startDate
					lte(bookings.startDate, endDate),
					gte(bookings.endDate, startDate),
				)
			)
			.limit(1);
		return conflicts.length === 0;
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

	// Booking operations
	async createBooking(data: Omit<NewBooking, 'id' | 'bookingNumber'>): Promise<Booking> {
		const id = crypto.randomUUID();
		const bookingNumber = `BK${Date.now().toString(36).toUpperCase()}`;
		await this.db.insert(bookings).values({ id, bookingNumber, ...data });
		const booking = await this.db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
		return booking[0]!;
	}
}