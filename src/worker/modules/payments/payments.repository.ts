import { eq, and, desc, sql } from 'drizzle-orm';
import {
	payments,
	bookings,
	customers,
	vehicles,
	users,
	type Payment,
	type NewPayment,
} from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';
import type { ListPaymentsQuery } from './payments.dto';

export class PaymentsRepository {
	constructor(private db: Database) {}

	async findById(id: string): Promise<Payment | null> {
		const result = await this.db
			.select()
			.from(payments)
			.where(eq(payments.id, id))
			.limit(1);
		return result[0] ?? null;
	}

	async list(query: ListPaymentsQuery): Promise<{ items: Payment[]; total: number }> {
		const offset = (query.page - 1) * query.limit;

		// Build where conditions
		const conditions = [];

		if (query.bookingId) {
			conditions.push(eq(payments.bookingId, query.bookingId));
		}

		if (query.status) {
			conditions.push(eq(payments.status, query.status));
		}

		if (query.method) {
			conditions.push(eq(payments.method, query.method));
		}

		if (query.dateFrom) {
			conditions.push(sql`${payments.createdAt} >= ${query.dateFrom}`);
		}

		if (query.dateTo) {
			conditions.push(sql`${payments.createdAt} <= ${query.dateTo}T23:59:59`);
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		// Get items
		const items = await this.db
			.select()
			.from(payments)
			.where(whereClause)
			.orderBy(desc(payments.createdAt))
			.limit(query.limit)
			.offset(offset);

		// Get total count
		const countResult = await this.db
			.select({ id: payments.id })
			.from(payments)
			.where(whereClause);

		const total = countResult.length;

		return { items, total };
	}

	async create(data: Omit<NewPayment, 'id'>): Promise<Payment> {
		const id = crypto.randomUUID();
		await this.db.insert(payments).values({ id, ...data });
		const payment = await this.findById(id);
		if (!payment) {
			throw new Error('Failed to create payment');
		}
		return payment;
	}

	async update(id: string, data: Partial<Omit<NewPayment, 'id' | 'createdAt'>>): Promise<Payment | null> {
		await this.db
			.update(payments)
			.set({ ...data, updatedAt: new Date().toISOString() })
			.where(eq(payments.id, id));
		return this.findById(id);
	}

	async verify(id: string, verifiedBy: string, notes?: string): Promise<Payment | null> {
		return this.update(id, {
			status: 'Verified',
			verifiedBy,
			verifiedAt: new Date().toISOString(),
			notes: notes ? notes : undefined,
		});
	}

	async reject(id: string, reason: string): Promise<Payment | null> {
		return this.update(id, {
			status: 'Failed',
			notes: reason,
		});
	}

	async getByBookingId(bookingId: string): Promise<Payment[]> {
		return this.db
			.select()
			.from(payments)
			.where(eq(payments.bookingId, bookingId))
			.orderBy(desc(payments.createdAt));
	}

	async findByTransactionReference(reference: string): Promise<Payment | null> {
		const result = await this.db
			.select()
			.from(payments)
			.where(eq(payments.transactionReference, reference))
			.limit(1);
		return result[0] ?? null;
	}

	async getPaymentWithDetails(id: string): Promise<{
		payment: Payment;
		booking: typeof bookings.$inferSelect;
		customer: typeof customers.$inferSelect;
		vehicle: typeof vehicles.$inferSelect;
		verifier: { id: string; name: string } | null;
	} | null> {
		const payment = await this.findById(id);
		if (!payment) return null;

		// Get booking
		const bookingResult = await this.db
			.select()
			.from(bookings)
			.where(eq(bookings.id, payment.bookingId))
			.limit(1);
		const booking = bookingResult[0];
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

		// Get verifier
		let verifier: { id: string; name: string } | null = null;
		if (payment.verifiedBy) {
			const userResult = await this.db
				.select({ id: users.id, name: users.name })
				.from(users)
				.where(eq(users.id, payment.verifiedBy))
				.limit(1);
			verifier = userResult[0] ?? null;
		}

		return { payment, booking, customer, vehicle, verifier };
	}

	async getPendingPayments(): Promise<{
		payment: Payment;
		booking: typeof bookings.$inferSelect;
		customer: typeof customers.$inferSelect;
	}[]> {
		const pendingPayments = await this.db
			.select()
			.from(payments)
			.where(eq(payments.status, 'Pending'))
			.orderBy(desc(payments.createdAt));

		const results: { payment: Payment; booking: typeof bookings.$inferSelect; customer: typeof customers.$inferSelect }[] = [];

		for (const payment of pendingPayments) {
			const bookingResult = await this.db
				.select()
				.from(bookings)
				.where(eq(bookings.id, payment.bookingId))
				.limit(1);
			const booking = bookingResult[0];
			if (!booking) continue;

			const customerResult = await this.db
				.select()
				.from(customers)
				.where(eq(customers.id, booking.customerId))
				.limit(1);
			const customer = customerResult[0];
			if (!customer) continue;

			results.push({ payment, booking, customer });
		}

		return results;
	}

	async getPaymentSummary(bookingId: string): Promise<{
		totalPaid: number;
		pendingAmount: number;
		remaining: number;
		isFullyPaid: boolean;
		paymentProgress: number;
	}> {
		const bookingPayments = await this.getByBookingId(bookingId);
		const booking = await this.db
			.select()
			.from(bookings)
			.where(eq(bookings.id, bookingId))
			.limit(1);

		const totalAmount = booking[0]?.totalAmount ?? 0;

		let totalPaid = 0;
		let pendingAmount = 0;

		for (const payment of bookingPayments) {
			if (payment.status === 'Verified') {
				totalPaid += payment.amount;
			} else if (payment.status === 'Pending') {
				pendingAmount += payment.amount;
			}
		}

		const remaining = Math.max(0, totalAmount - totalPaid);
		const isFullyPaid = totalPaid >= totalAmount;
		const paymentProgress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

		return {
			totalPaid,
			pendingAmount,
			remaining,
			isFullyPaid,
			paymentProgress,
		};
	}

	async getStats(): Promise<{
		total: number;
		byStatus: Record<string, number>;
		byMethod: Record<string, number>;
		totalAmount: number;
	}> {
		const allPayments = await this.db.select().from(payments);

		const byStatus: Record<string, number> = {
			Pending: 0,
			Verified: 0,
			Failed: 0,
		};

		const byMethod: Record<string, number> = {
			QRIS: 0,
			Gateway: 0,
			BankTransfer: 0,
			Cash: 0,
		};

		let totalAmount = 0;

		for (const payment of allPayments) {
			byStatus[payment.status] = (byStatus[payment.status] ?? 0) + 1;
			byMethod[payment.method] = (byMethod[payment.method] ?? 0) + 1;
			if (payment.status === 'Verified') {
				totalAmount += payment.amount;
			}
		}

		return {
			total: allPayments.length,
			byStatus,
			byMethod,
			totalAmount,
		};
	}

	async getBookingPaymentSummaries(): Promise<{
		bookingId: string;
		bookingNumber: string;
		customerName: string;
		vehicleName: string;
		startDate: string;
		endDate: string;
		totalAmount: number;
		totalPaid: number;
		pendingAmount: number;
		remaining: number;
		isFullyPaid: boolean;
		paymentProgress: number;
		bookingStatus: string;
		paymentType: string;
	}[]> {
		// Get all non-cancelled bookings
		const allBookings = await this.db
			.select()
			.from(bookings)
			.where(sql`${bookings.status} NOT IN ('Cancelled', 'expired', 'refunded')`)
			.orderBy(desc(bookings.createdAt));

		const results: {
			bookingId: string;
			bookingNumber: string;
			customerName: string;
			vehicleName: string;
			startDate: string;
			endDate: string;
			totalAmount: number;
			totalPaid: number;
			pendingAmount: number;
			remaining: number;
			isFullyPaid: boolean;
			paymentProgress: number;
			bookingStatus: string;
			paymentType: string;
		}[] = [];

		for (const booking of allBookings) {
			// Get customer
			const customerResult = await this.db
				.select()
				.from(customers)
				.where(eq(customers.id, booking.customerId))
				.limit(1);
			const customer = customerResult[0];

			// Get vehicle
			const vehicleResult = await this.db
				.select()
				.from(vehicles)
				.where(eq(vehicles.id, booking.vehicleId))
				.limit(1);
			const vehicle = vehicleResult[0];

			// Get payment summary
			const summary = await this.getPaymentSummary(booking.id);

			results.push({
				bookingId: booking.id,
				bookingNumber: booking.bookingNumber,
				customerName: customer?.name ?? 'Unknown',
				vehicleName: vehicle?.name ?? 'Unknown',
				startDate: booking.startDate,
				endDate: booking.endDate,
				totalAmount: booking.totalAmount,
				totalPaid: summary.totalPaid,
				pendingAmount: summary.pendingAmount,
				remaining: summary.remaining,
				isFullyPaid: summary.isFullyPaid,
				paymentProgress: summary.paymentProgress,
				bookingStatus: booking.status,
				paymentType: booking.paymentType ?? 'full',
			});
		}

		return results;
	}
}
