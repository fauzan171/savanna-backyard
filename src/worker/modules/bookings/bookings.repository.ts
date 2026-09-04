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

/** Columns written by createIfNoConflict (RACE-001 atomic slot insert). */
export interface CreateBookingSlotData {
	bookingNumber: string;
	customerId: string;
	vehicleId: string;
	startDate: string;
	endDate: string;
	status: Booking['status'];
	paymentTerms: NewBooking['paymentTerms'];
	baseAmount: number;
	addonsAmount: number;
	lateFee: number;
	totalAmount: number;
	currency: 'IDR' | 'USD';
	notes: string | null;
	createdBy: string | null;
}

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
					// TC-CAL-001: Pending bookings must show in the admin calendar too
					inArray(bookings.status, ['Pending', 'Confirmed', 'Active', 'pending_payment']),
					lt(bookings.startDate, endDateExclusive),
					gt(bookings.endDate, startDate),
				),
			);
	}

	/**
	 * BK-08: list with joined customer + vehicle in ONE query.
	 * Previously the service fanned out ~7 queries per row via Promise.all,
	 * which burst past D1's per-isolate concurrency limit (intermittent 500s)
	 * and threw NotFoundError when a joined row was missing (orphan booking).
	 * LEFT JOINs keep rows for missing customer/vehicle; service maps fallbacks.
	 */
	async list(query: ListBookingsQuery): Promise<{
		rows: Array<{
			booking: Booking;
			customer: typeof customers.$inferSelect | null;
			vehicle: typeof vehicles.$inferSelect | null;
		}>;
		total: number;
	}> {
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

		// Items: bookings + LEFT JOINed customer/vehicle (nested result objects)
		const items = await this.db
			.select({ booking: bookings, customer: customers, vehicle: vehicles })
			.from(bookings)
			.leftJoin(customers, eq(customers.id, bookings.customerId))
			.leftJoin(vehicles, eq(vehicles.id, bookings.vehicleId))
			.where(whereClause)
			.orderBy(desc(bookings.createdAt))
			.limit(query.limit)
			.offset(offset);

		// Get total count (single aggregate, not a full id fetch)
		const countResult = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(bookings)
			.where(whereClause);

		return { rows: items, total: Number(countResult[0]?.count ?? 0) };
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

	/**
	 * RACE-001: overlap check + INSERT in ONE atomic statement.
	 * D1 serializes write statements through its consensus log, so a second
	 * concurrent request evaluates the NOT EXISTS subquery AFTER the first
	 * insert commits → inserts 0 rows → meta.changes === 0 → returns null.
	 * Why not `BEGIN IMMEDIATE`: drizzle's D1 transaction issues BEGIN/SELECT/
	 * INSERT as separate stateless D1 HTTP calls (no cross-isolate write lock),
	 * and a unique index cannot express a date-range overlap predicate.
	 * Overlap predicate mirrors findConflictingBookings (end-exclusive).
	 */
	async createIfNoConflict(data: CreateBookingSlotData): Promise<Booking | null> {
		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		const result = await this.db.run(sql`
			INSERT INTO bookings (
				id, booking_number, customer_id, vehicle_id, start_date, end_date,
				status, payment_terms, base_amount, addons_amount, late_fee,
				total_amount, currency, notes, created_by, created_at, updated_at
			)
			SELECT
				${id}, ${data.bookingNumber}, ${data.customerId}, ${data.vehicleId}, ${data.startDate}, ${data.endDate},
				${data.status}, ${data.paymentTerms}, ${data.baseAmount}, ${data.addonsAmount}, ${data.lateFee},
				${data.totalAmount}, ${data.currency}, ${data.notes}, ${data.createdBy}, ${now}, ${now}
			WHERE NOT EXISTS (
				SELECT 1 FROM bookings
				WHERE vehicle_id = ${data.vehicleId}
					AND status IN ('Pending', 'pending_payment', 'Confirmed', 'Active')
					AND start_date < ${data.endDate}
					AND end_date > ${data.startDate}
				LIMIT 1
			)
		`);
		if (Number(result.meta.changes) === 0) {
			return null; // conflict won the slot — nothing inserted
		}
		return this.findById(id);
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

	/**
	 * BK-08: aggregated paid/pending amounts for MANY bookings in one grouped
	 * query — replaces the per-row getPaymentSummary fan-out in the list path.
	 */
	async getPaymentTotals(bookingIds: string[]): Promise<Map<string, { totalPaid: number; pendingAmount: number }>> {
		if (bookingIds.length === 0) return new Map();
		const rows = await this.db
			.select({
				bookingId: payments.bookingId,
				totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'Verified' THEN ${payments.amount} ELSE 0 END), 0)`,
				pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'Pending' THEN ${payments.amount} ELSE 0 END), 0)`,
			})
			.from(payments)
			.where(inArray(payments.bookingId, bookingIds))
			.groupBy(payments.bookingId);
		return new Map(
			rows.map((r) => [r.bookingId, { totalPaid: Number(r.totalPaid ?? 0), pendingAmount: Number(r.pendingAmount ?? 0) }]),
		);
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
		const values = {
			id: crypto.randomUUID(),
			bookingId,
			fromStatus,
			toStatus,
			changedBy: changedBy ?? null,
			note: note ?? null,
		};
		try {
			await this.db.insert(bookingStatusLogs).values(values);
		} catch (e) {
			// TC-BK-003: hotfix 0012 swallowed missing-table errors, so History stayed
			// empty wherever migration 0012 had not applied. Self-heal instead: create
			// the table (same DDL as 0012, IF NOT EXISTS) and retry the insert once.
			if (!String(e).includes('no such table')) throw e;
			try {
				await this.ensureStatusLogTable();
				await this.db.insert(bookingStatusLogs).values(values);
			} catch {
				// Still fail-soft: history logging must never break a status transition.
			}
		}
	}

	/** DDL mirrored from migrations/0012_booking_status_logs.sql (idempotent). */
	private async ensureStatusLogTable(): Promise<void> {
		await this.db.run(sql`CREATE TABLE IF NOT EXISTS booking_status_logs (
			id text PRIMARY KEY NOT NULL,
			booking_id text NOT NULL,
			from_status text,
			to_status text NOT NULL,
			changed_by text,
			note text,
			created_at text NOT NULL
		)`);
		await this.db.run(sql`CREATE INDEX IF NOT EXISTS booking_status_logs_booking_idx ON booking_status_logs (booking_id)`);
		await this.db.run(sql`CREATE INDEX IF NOT EXISTS booking_status_logs_created_idx ON booking_status_logs (created_at)`);
	}

	/** Fetch status history for a booking, newest first. */
	async getBookingHistory(bookingId: string): Promise<BookingStatusLog[]> {
		try {
			return await this.db
				.select()
				.from(bookingStatusLogs)
				.where(eq(bookingStatusLogs.bookingId, bookingId))
				.orderBy(desc(bookingStatusLogs.createdAt));
		} catch (e) {
			if (String(e).includes('no such table')) return [];
			throw e;
		}
	}
}
