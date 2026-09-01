import { eq, and, or, desc, inArray, lt, gt, not, sql } from 'drizzle-orm';
import {
	bookings,
	bookingAddons,
	bookingEquipment,
	bookingStatusLogs,
	equipment,
	customers,
	vehicles,
	users,
	payments,
	type Booking,
	type NewBooking,
	type BookingAddon,
	type NewBookingAddon,
	type BookingStatusLog,
} from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';
import type { ListBookingsQuery } from './bookings.dto';

export class BookingsRepository {
	constructor(private db: Database) {}

	async findById(id: string): Promise<Booking | null> {
		const result = await this.db
			.select()
			.from(bookings)
			.where(eq(bookings.id, id))
			.limit(1);
		return result[0] ?? null;
	}

	async findByBookingNumber(bookingNumber: string): Promise<Booking | null> {
		const result = await this.db
			.select()
			.from(bookings)
			.where(eq(bookings.bookingNumber, bookingNumber))
			.limit(1);
		return result[0] ?? null;
	}

	/** Find the active rental for a vehicle (for admin QR scan-return resolution). */
	async findActiveByVehicle(vehicleId: string): Promise<Booking | null> {
		const result = await this.db
			.select()
			.from(bookings)
			.where(and(eq(bookings.vehicleId, vehicleId), eq(bookings.status, 'Active')))
			.orderBy(desc(bookings.endDate))
			.limit(1);
		return result[0] ?? null;
	}

	/**
	 * Bookings overlapping a date range, joined with customer — for the admin
	 * calendar matrix. `endDateExclusive` is the day AFTER the last day of the
	 * window (end-exclusive overlap, matching findConflictingBookings).
	 */
	async findBookingsInRangeWithCustomer(startDate: string, endDateExclusive: string): Promise<Array<{
		id: string;
		bookingNumber: string;
		vehicleId: string;
		startDate: string;
		endDate: string;
		status: string;
		customerName: string;
		customerPhone: string;
	}>> {
		return this.db
			.select({
				id: bookings.id,
				bookingNumber: bookings.bookingNumber,
				vehicleId: bookings.vehicleId,
				startDate: bookings.startDate,
				endDate: bookings.endDate,
				status: bookings.status,
				customerName: customers.name,
				customerPhone: customers.phone,
			})
			.from(bookings)
			.innerJoin(customers, eq(customers.id, bookings.customerId))
			.where(
				and(
					inArray(bookings.status, ['Confirmed', 'Active', 'pending_payment']),
					lt(bookings.startDate, endDateExclusive),
					gt(bookings.endDate, startDate),
				),
			);
	}

	async list(query: ListBookingsQuery): Promise<{ items: Booking[]; total: number }> {
		const offset = (query.page - 1) * query.limit;

		// Build where conditions
		const conditions = [];

		if (query.status) {
			conditions.push(eq(bookings.status, query.status));
		}

		if (query.customerId) {
			conditions.push(eq(bookings.customerId, query.customerId));
		}

		if (query.vehicleId) {
			conditions.push(eq(bookings.vehicleId, query.vehicleId));
		}

		if (query.startDateFrom) {
			conditions.push(sql`${bookings.startDate} >= ${query.startDateFrom}`);
		}

		if (query.startDateTo) {
			conditions.push(sql`${bookings.startDate} <= ${query.startDateTo}`);
		}

		if (query.search) {
			conditions.push(eq(bookings.bookingNumber, query.search));
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		// Get items
		const items = await this.db
			.select()
			.from(bookings)
			.where(whereClause)
			.orderBy(desc(bookings.createdAt))
			.limit(query.limit)
			.offset(offset);

		// Get total count
		const countResult = await this.db
			.select({ id: bookings.id })
			.from(bookings)
			.where(whereClause);

		const total = countResult.length;

		return { items, total };
	}

	async create(data: Omit<NewBooking, 'id'>): Promise<Booking> {
		const id = crypto.randomUUID();
		await this.db.insert(bookings).values({ id, ...data });
		const booking = await this.findById(id);
		if (!booking) {
			throw new Error('Failed to create booking');
		}
		return booking;
	}

	async update(id: string, data: Partial<Omit<NewBooking, 'id' | 'createdAt' | 'bookingNumber'>>): Promise<Booking | null> {
		await this.db
			.update(bookings)
			.set({ ...data, updatedAt: new Date().toISOString() })
			.where(eq(bookings.id, id));
		return this.findById(id);
	}

	async updateStatus(id: string, status: Booking['status']): Promise<Booking | null> {
		return this.update(id, { status });
	}

	async confirm(id: string): Promise<Booking | null> {
		return this.update(id, { status: 'Confirmed' });
	}

	async startRental(
		id: string,
		data: { startKm: number; pickupChecklistId?: string },
	): Promise<Booking | null> {
		return this.update(id, {
			status: 'Active',
			startKm: data.startKm,
			pickupConfirmed: true,
			pickupConfirmedAt: new Date().toISOString(),
			pickupChecklistId: data.pickupChecklistId,
		});
	}

	async completeRental(
		id: string,
		data: {
			actualReturnDate: string;
			endKm: number;
			lateFee: number;
			totalAmount: number;
			damageFee?: number;
			totalPenalty?: number;
			returnChecklistId?: string;
		}
	): Promise<Booking | null> {
		return this.update(id, {
			status: 'Completed',
			actualReturnDate: data.actualReturnDate,
			endKm: data.endKm,
			lateFee: data.lateFee,
			totalAmount: data.totalAmount,
			damageFee: data.damageFee ?? 0,
			totalPenalty: data.totalPenalty ?? 0,
			returnConfirmed: true,
			returnConfirmedAt: new Date().toISOString(),
			returnChecklistId: data.returnChecklistId,
		});
	}

	async cancel(id: string): Promise<Booking | null> {
		return this.update(id, {
			status: 'Cancelled',
			cancelledAt: new Date().toISOString(),
		});
	}

	async extend(id: string, newEndDate: string, newTotalAmount: number): Promise<Booking | null> {
		return this.update(id, {
			endDate: newEndDate,
			totalAmount: newTotalAmount,
		});
	}

	// BIZ-03: equipment stock tied to a booking via booking_equipment rows
	// (created on the public booking path). Used to restore stock on cancel so
	// cancelled reservations don't permanently hold inventory.
	async listBookingEquipment(bookingId: string): Promise<{ equipmentId: string; quantity: number }[]> {
		const rows = await this.db
			.select({ equipmentId: bookingEquipment.equipmentId, quantity: bookingEquipment.quantity })
			.from(bookingEquipment)
			.where(eq(bookingEquipment.bookingId, bookingId));
		return rows;
	}

	async restoreEquipmentStock(equipmentId: string, qty: number): Promise<void> {
		await this.db
			.update(equipment)
			.set({ stock: sql`${equipment.stock} + ${qty}` })
			.where(eq(equipment.id, equipmentId));
	}

	// Addons
	async getAddons(bookingId: string): Promise<BookingAddon[]> {
		return this.db
			.select()
			.from(bookingAddons)
			.where(eq(bookingAddons.bookingId, bookingId));
	}

	async createAddon(data: Omit<NewBookingAddon, 'id'>): Promise<BookingAddon> {
		const id = crypto.randomUUID();
		await this.db.insert(bookingAddons).values({ id, ...data });
		const result = await this.db
			.select()
			.from(bookingAddons)
			.where(eq(bookingAddons.id, id))
			.limit(1);
		if (!result[0]) {
			throw new Error('Failed to create addon');
		}
		return result[0];
	}

	async deleteAddon(bookingId: string, addonId: string): Promise<boolean> {
		await this.db
			.delete(bookingAddons)
			.where(and(
				eq(bookingAddons.id, addonId),
				eq(bookingAddons.bookingId, bookingId)
			));
		return true;
	}

	async updateAddonsAmount(bookingId: string, addonsAmount: number, totalAmount: number): Promise<Booking | null> {
		return this.update(bookingId, { addonsAmount, totalAmount });
	}

	// Get booking with related data
	async getBookingWithDetails(id: string): Promise<{
		booking: Booking;
		customer: typeof customers.$inferSelect;
		vehicle: typeof vehicles.$inferSelect;
		creator: { id: string; name: string } | null;
	} | null> {
		const booking = await this.findById(id);
		if (!booking) return null;

		// Get customer
		const customerResult = await this.db
			.select()
			.from(customers)
			.where(eq(customers.id, booking.customerId))
			.limit(1);
		const customer = customerResult[0];
		if (!customer) return null;

		// Get vehicle
		const vehicleResult = await this.db
			.select()
			.from(vehicles)
			.where(eq(vehicles.id, booking.vehicleId))
			.limit(1);
		const vehicle = vehicleResult[0];
		if (!vehicle) return null;

		// Get creator
		let creator: { id: string; name: string } | null = null;
		if (booking.createdBy) {
			const userResult = await this.db
				.select({ id: users.id, name: users.name })
				.from(users)
				.where(eq(users.id, booking.createdBy))
				.limit(1);
			creator = userResult[0] ?? null;
		}

		return { booking, customer, vehicle, creator };
	}

	// Check for conflicting bookings (for availability)
	async findConflictingBookings(
		vehicleId: string,
		startDate: string,
		endDate: string,
		excludeBookingId?: string
	): Promise<Booking[]> {
		const conditions = [
			eq(bookings.vehicleId, vehicleId),
			// B1: treat all non-terminal statuses as potential conflicts so admin and
			// public booking paths agree (was ['Confirmed','Active'] only).
			inArray(bookings.status, ['Pending', 'pending_payment', 'Confirmed', 'Active']),
			// End date exclusive overlap: existing.start < new.end AND existing.end > new.start
			lt(bookings.startDate, endDate),
			gt(bookings.endDate, startDate),
		];

		if (excludeBookingId) {
			conditions.push(not(eq(bookings.id, excludeBookingId)));
		}

		return this.db
			.select()
			.from(bookings)
			.where(and(...conditions));
	}

	// Get payments for a booking
	async getPaymentsByBookingId(bookingId: string): Promise<typeof payments.$inferSelect[]> {
		return this.db
			.select()
			.from(payments)
			.where(eq(payments.bookingId, bookingId))
			.orderBy(desc(payments.createdAt));
	}

	// B5: mark a booking's non-terminal payments as Cancelled so they don't
	// linger as Verified revenue on a cancelled booking.
	async cancelPendingPaymentsByBookingId(bookingId: string): Promise<void> {
		await this.db
			.update(payments)
			.set({ status: 'Cancelled', updatedAt: new Date().toISOString() })
			.where(
				and(
					eq(payments.bookingId, bookingId),
					inArray(payments.status, ['Pending', 'Verified']),
				),
			);
	}

	// Get booking stats
	async getStats(): Promise<{
		total: number;
		byStatus: Record<string, number>;
		totalRevenue: number;
	}> {
		const allBookings = await this.db.select().from(bookings);

		const byStatus: Record<string, number> = {
			Pending: 0,
			Confirmed: 0,
			Active: 0,
			Completed: 0,
			Cancelled: 0,
		};

		let totalRevenue = 0;

		for (const booking of allBookings) {
			byStatus[booking.status] = (byStatus[booking.status] ?? 0) + 1;
			if (booking.status === 'Completed') {
				totalRevenue += booking.totalAmount;
			}
		}

		return {
			total: allBookings.length,
			byStatus,
			totalRevenue,
		};
	}

	/**
	 * Confirmed bookings whose rental start time has arrived.
	 * Used by the scheduled cron to auto-transition Confirmed -> Active.
	 */
	async getConfirmedReadyToActivate(): Promise<Booking[]> {
		const now = new Date().toISOString();
		return this.db
			.select()
			.from(bookings)
			.where(and(
				eq(bookings.status, 'Confirmed'),
				sql`${bookings.startDate} <= ${now}`,
			));
	}

	/**
	 * Find the nearest Confirmed (or Active) booking for a given vehicle.
	 * Used by the QR scan endpoint to decide whether the scan is for
	 * pickup checklist or motor condition check.
	 */
	async countActiveByVehicle(vehicleId: string): Promise<number> {
		const rows = await this.db
			.select({ id: bookings.id })
			.from(bookings)
			.where(
				and(
					eq(bookings.vehicleId, vehicleId),
					inArray(bookings.status, ['Pending', 'Confirmed', 'Active']),
				),
			);
		return rows.length;
	}

	async findUpcomingConfirmedByVehicle(vehicleId: string): Promise<Booking | null> {
		const rows = await this.db
			.select()
			.from(bookings)
			.where(and(
				eq(bookings.vehicleId, vehicleId),
				or(eq(bookings.status, 'Confirmed'), eq(bookings.status, 'Active')),
				sql`${bookings.startDate} >= datetime('now', '-1 days')`,
			))
			.orderBy(bookings.startDate)
			.limit(1);
		return rows[0] ?? null;
	}
	/**
	 * Active bookings whose end time has passed (overdue).
	 * Used by the scheduled cron to auto-complete and calculate late fees.
	 */
	async getActiveOverdue(): Promise<Booking[]> {
		const now = new Date().toISOString();
		return this.db
			.select()
			.from(bookings)
			.where(and(
				eq(bookings.status, 'Active'),
				sql`${bookings.endDate} < ${now}`,
				sql`${bookings.actualReturnDate} IS NULL`,
			));
	}

	// ── Status History Logging ──

	/** Record a booking status change for the History tab. */
	async logStatusChange(
		bookingId: string,
		fromStatus: string | null,
		toStatus: string,
		changedBy?: string,
		note?: string,
	): Promise<void> {
		await this.db.insert(bookingStatusLogs).values({
			id: crypto.randomUUID(),
			bookingId,
			fromStatus,
			toStatus,
			changedBy: changedBy ?? null,
			note: note ?? null,
		});
	}

	/** Fetch status history for a booking, newest first. */
	async getBookingHistory(bookingId: string): Promise<BookingStatusLog[]> {
		return this.db
			.select()
			.from(bookingStatusLogs)
			.where(eq(bookingStatusLogs.bookingId, bookingId))
			.orderBy(desc(bookingStatusLogs.createdAt));
	}
}
