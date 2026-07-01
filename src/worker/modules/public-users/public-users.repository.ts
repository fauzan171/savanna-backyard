import { eq, desc, and, gte, sql, isNull } from 'drizzle-orm';
import type { Database } from '@/worker/core/database';
import {
	publicUsers,
	verificationCodes,
	bookings,
	customers,
	type PublicUser,
	type NewPublicUser,
	type VerificationCode,
	type NewVerificationCode,
	type Booking,
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

	async findLatestVerificationByPhone(phone: string): Promise<VerificationCode | null> {
		const now = new Date().toISOString();
		const [v] = await this.db
			.select()
			.from(verificationCodes)
			.where(and(eq(verificationCodes.phone, phone), eq(verificationCodes.consumed, false), gte(verificationCodes.expiresAt, now)))
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
		return this.db
			.select()
			.from(bookings)
			.innerJoin(customers, eq(customers.id, bookings.customerId))
			.where(and(eq(customers.phone, phone), isNull(bookings.publicUserId)))
			.orderBy(desc(bookings.createdAt))
			.limit(limit) as unknown as Booking[];
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

	/** Mark a booking as pickup-confirmed and activate it (soft confirm — no startKm). */
	async confirmPickup(bookingId: string): Promise<Booking> {
		const now = new Date().toISOString();
		await this.db
			.update(bookings)
			.set({ pickupConfirmed: true, pickupConfirmedAt: now, status: 'Active', updatedAt: now })
			.where(eq(bookings.id, bookingId));
		const [b] = await this.db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
		return b!;
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
