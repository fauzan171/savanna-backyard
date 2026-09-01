import { and, eq, lt, sql } from 'drizzle-orm';
import { bookingEquipment, bookings, equipment } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';

type CleanupResult = {
	processed: number;
	stockRestored: number;
	failed: number;
};

export class BookingCleanupService {
	constructor(
		private db: Database,
		private pendingPaymentTtlMs = 60 * 60 * 1000,
	) {}

	async runCleanupExpiredBookings(now = new Date()): Promise<CleanupResult> {
		const cutoff = new Date(now.getTime() - this.pendingPaymentTtlMs).toISOString();
		const expiredBookings = await this.db
			.select({ id: bookings.id })
			.from(bookings)
			.where(and(eq(bookings.status, 'pending_payment'), lt(bookings.createdAt, cutoff)));

		let processed = 0;
		let stockRestored = 0;
		let failed = 0;

		for (const booking of expiredBookings) {
			try {
				const rows = await this.db
					.select({ equipmentId: bookingEquipment.equipmentId, quantity: bookingEquipment.quantity })
					.from(bookingEquipment)
					.where(eq(bookingEquipment.bookingId, booking.id));

				for (const row of rows) {
					await this.db
						.update(equipment)
						.set({ stock: sql`${equipment.stock} + ${row.quantity}` })
						.where(eq(equipment.id, row.equipmentId));
					stockRestored += row.quantity;
				}

				await this.db
					.update(bookings)
					.set({
						status: 'expired',
						updatedAt: now.toISOString(),
						notes: sql`COALESCE(${bookings.notes} || char(10) || char(10), '') || '[System] Expired pending payment booking cleanup'`,
					})
					.where(eq(bookings.id, booking.id));

				processed++;
			} catch (error) {
				failed++;
				console.error('[BookingCleanupService] Failed to expire booking', booking.id, error);
			}
		}

		return { processed, stockRestored, failed };
	}
}
