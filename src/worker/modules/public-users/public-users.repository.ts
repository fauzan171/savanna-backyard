import { eq, desc, and, gte, sql, isNull } from 'drizzle-orm';
import type { Database } from '@/worker/core/database';
import {
	publicUsers,
	verificationCodes,
	bookings,
	customers,
	vehicles,
	vehicleChecklists,
	type PublicUser,
	type NewPublicUser,
	type VerificationCode,
	type NewVerificationCode,
	type Booking,
	type Vehicle,
	type VehicleChecklist,
} from '@/worker/core/database/schema';

export class PublicUsersRepository {
	constructor(private db: Database) {}

	// ---------------- public_users ----------------
	async findByPhone(phone: string): Promise<PublicUser | null> {
		const [u] = await this.db.select().from(publicUsers).where(eq(publicUsers.phone, phone)).limit(1);
		return u ?? null;
	}

	async findById(id: string): Promise<PublicUser | null> {
		const [u] = await this.db.select().from(publicUsers).where(eq(publicUsers.id, id)).limit(1);
		return u ?? null;
	}

	async findByEmail(email: string): Promise<PublicUser | null> {
		const [u] = await this.db.select().from(publicUsers).where(eq(publicUsers.email, email)).limit(1);
		return u ?? null;
	}

	async create(data: Omit<NewPublicUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<PublicUser> {
		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		await this.db.insert(publicUsers).values({ id, ...data, createdAt: now, updatedAt: now });
		const [u] = await this.db.select().from(publicUsers).where(eq(publicUsers.id, id)).limit(1);
		return u!;
	}

	async update(id: string, data: Partial<NewPublicUser>): Promise<PublicUser> {
		await this.db.update(publicUsers).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(publicUsers.id, id));
		const [u] = await this.db.select().from(publicUsers).where(eq(publicUsers.id, id)).limit(1);
		return u!;
	}

	async setPhoneVerified(id: string, phone: string): Promise<void> {
		await this.db
			.update(publicUsers)
			.set({ phone, phoneVerified: true, updatedAt: new Date().toISOString() })
			.where(eq(publicUsers.id, id));
	}

	// ---------------- verification_codes ----------------
	async createVerificationCode(data: Omit<NewVerificationCode, 'id' | 'createdAt'>): Promise<VerificationCode> {
		const id = crypto.randomUUID();
		await this.db.insert(verificationCodes).values({ id, ...data, createdAt: new Date().toISOString() });
		const [v] = await this.db.select().from(verificationCodes).where(eq(verificationCodes.id, id)).limit(1);
		return v!;
	}

	async findActiveVerificationByRef(refCode: string): Promise<VerificationCode | null> {
		const now = new Date().toISOString();
		const [v] = await this.db
			.select()
			.from(verificationCodes)
			.where(and(eq(verificationCodes.refCode, refCode), eq(verificationCodes.consumed, false), gte(verificationCodes.expiresAt, now)))
			.orderBy(desc(verificationCodes.createdAt))
			.limit(1);
		return v ?? null;
	}

	async findLatestVerificationByPhone(phone: string, publicUserId?: string): Promise<VerificationCode | null> {
		const now = new Date().toISOString();
		// C4: scope by publicUserId when provided so a code issued to user A's
		// phone can't be consumed by user B (IDOR). publicUserId is nullable on
		// the column, so we only filter when explicitly given.
		const conds = [
			eq(verificationCodes.phone, phone),
			eq(verificationCodes.consumed, false),
			gte(verificationCodes.expiresAt, now),
		];
		if (publicUserId) {
			conds.push(eq(verificationCodes.publicUserId, publicUserId));
		}
		const [v] = await this.db
			.select()
			.from(verificationCodes)
			.where(and(...conds))
			.orderBy(desc(verificationCodes.createdAt))
			.limit(1);
		return v ?? null;
	}

	async countRecentVerificationByPhone(phone: string, sinceIso: string): Promise<number> {
		const rows = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(verificationCodes)
			.where(and(eq(verificationCodes.phone, phone), gte(verificationCodes.createdAt, sinceIso)));
		return Number(rows[0]?.count ?? 0);
	}

	/**
	 * Count recent verifications issued BY a specific user (regardless of phone).
	 * BUG#6: prevents one attacker account from fanning OTP spam out to many
	 * different victim phone numbers (the per-phone limit alone doesn't stop
	 * that).
	 */
	async countRecentVerificationByUser(publicUserId: string, sinceIso: string): Promise<number> {
		const rows = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(verificationCodes)
			.where(and(eq(verificationCodes.publicUserId, publicUserId), gte(verificationCodes.createdAt, sinceIso)));
		return Number(rows[0]?.count ?? 0);
	}

	async updateVerification(id: string, data: Partial<NewVerificationCode>): Promise<void> {
		await this.db.update(verificationCodes).set(data).where(eq(verificationCodes.id, id));
	}

	// ---------------- bookings (account-scoped) ----------------
	async listBookingsByPublicUser(publicUserId: string, limit = 50): Promise<Booking[]> {
		return this.db
			.select()
			.from(bookings)
			.where(eq(bookings.publicUserId, publicUserId))
			.orderBy(desc(bookings.createdAt))
			.limit(limit);
	}

	/**
	 * Legacy fallback: find bookings where the customer phone matches the public user's
	 * phone but publicUserId is still NULL (booking created before account linking was
	 * added, or cookie was absent during booking creation).
	 */
	async listBookingsByPhone(phone: string, limit = 50): Promise<Booking[]> {
		const rows = await this.db
			.select({ booking: bookings })
			.from(bookings)
			.innerJoin(customers, eq(customers.id, bookings.customerId))
			.where(and(eq(customers.phone, phone), isNull(bookings.publicUserId)))
			.orderBy(desc(bookings.createdAt))
			.limit(limit);
		return rows.map((row) => row.booking);
	}

	/** Link unlinked bookings to a public user by customer phone match. */
	async linkBookingsByPhone(publicUserId: string, phone: string): Promise<number> {
		const result = await this.db
			.update(bookings)
			.set({ publicUserId, updatedAt: new Date().toISOString() })
			.where(
				and(
					isNull(bookings.publicUserId),
					sql`${bookings.customerId} IN (SELECT ${customers.id} FROM ${customers} WHERE ${customers.phone} = ${phone})`,
				),
			);
		return result.meta?.rows_written ?? 0;
	}

	async findBookingByIdAndUser(bookingId: string, publicUserId: string): Promise<Booking | null> {
		const [b] = await this.db
			.select()
			.from(bookings)
			.where(and(eq(bookings.id, bookingId), eq(bookings.publicUserId, publicUserId)))
			.limit(1);
		return b ?? null;
	}

	async findBookingByNumberAndUser(bookingNumber: string, publicUserId: string): Promise<Booking | null> {
		const [b] = await this.db
			.select()
			.from(bookings)
			.where(and(eq(bookings.bookingNumber, bookingNumber), eq(bookings.publicUserId, publicUserId)))
			.limit(1);
		return b ?? null;
	}

	async findVehicleById(vehicleId: string): Promise<Vehicle | null> {
		const [vehicle] = await this.db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
		return vehicle ?? null;
	}

	async findChecklist(bookingId: string, type: 'pickup' | 'return'): Promise<VehicleChecklist | null> {
		const [checklist] = await this.db
			.select()
			.from(vehicleChecklists)
			.where(and(
				eq(vehicleChecklists.bookingId, bookingId),
				eq(vehicleChecklists.type, type),
				eq(vehicleChecklists.submissionSource, 'customer'),
			))
			.limit(1);
		return checklist ?? null;
	}

	async createAndRecordCustomerInspection(data: {
		bookingId: string;
		vehicleId: string;
		type: 'pickup' | 'return';
		items: Record<string, 'ok' | 'issue'>;
		kmReading: number;
		fuelLevel?: number | null;
		photos: string[];
		notes?: string | null;
		publicUserId: string;
	}): Promise<{ checklist: VehicleChecklist; booking: Booking }> {
		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		const insertChecklist = this.db.insert(vehicleChecklists).values({
			id,
			bookingId: data.bookingId,
			vehicleId: data.vehicleId,
			type: data.type,
			submissionSource: 'customer',
			items: JSON.stringify(data.items),
			kmReading: data.kmReading,
			fuelLevel: data.fuelLevel ?? null,
			photos: JSON.stringify(data.photos),
			notes: data.notes ?? null,
			damageNotes: data.type === 'return' ? data.notes ?? null : null,
			createdBy: null,
			createdByPublicUserId: data.publicUserId,
		});
		const bookingUpdate = data.type === 'pickup'
			? { pickupConfirmed: true, pickupConfirmedAt: now, customerPickupChecklistId: id, updatedAt: now }
			: { returnConfirmed: true, returnConfirmedAt: now, customerReturnChecklistId: id, updatedAt: now };
		await this.db.batch([
			insertChecklist,
			this.db.update(bookings).set(bookingUpdate).where(eq(bookings.id, data.bookingId)),
		]);
		const [created] = await this.db.select().from(vehicleChecklists).where(eq(vehicleChecklists.id, id)).limit(1);
		const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, data.bookingId)).limit(1);
		return { checklist: created!, booking: booking! };
	}

	async recordExistingCustomerInspection(bookingId: string, type: 'pickup' | 'return', checklistId: string): Promise<Booking> {
		const now = new Date().toISOString();
		const update = type === 'pickup'
			? { pickupConfirmed: true, pickupConfirmedAt: now, customerPickupChecklistId: checklistId, updatedAt: now }
			: { returnConfirmed: true, returnConfirmedAt: now, customerReturnChecklistId: checklistId, updatedAt: now };
		await this.db.update(bookings).set(update).where(eq(bookings.id, bookingId));
		const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
		return booking!;
	}

	/** Update payment link and Xendit invoice id on a booking (e.g. remainder payment). */
	async updateBookingPaymentLink(
		bookingId: string,
		data: { paymentPageUrl?: string; xenditInvoiceId?: string },
	): Promise<void> {
		const set: Record<string, unknown> = { updatedAt: new Date().toISOString() };
		if (data.paymentPageUrl) set.paymentPageUrl = data.paymentPageUrl;
		if (data.xenditInvoiceId) set.xenditInvoiceId = data.xenditInvoiceId;
		await this.db.update(bookings).set(set).where(eq(bookings.id, bookingId));
	}
}
