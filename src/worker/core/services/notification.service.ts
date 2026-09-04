import { eq, and, isNull } from 'drizzle-orm';
import { bookings, customers, vehicles } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';
import type { EmailService } from './email.service';
import type { ConfigRepository } from '@/worker/core/repositories/config.repository';

/**
 * Notification service for scheduled email jobs.
 *
 * Runs via Cloudflare Workers Cron Triggers:
 * - Daily at 05:00 WIB → H-1 reminders (bookings starting tomorrow)
 * - Hourly → H-1 jam reminders (bookings starting within ~1 hour)
 * - Hourly → Follow-up + review request (bookings that ended yesterday)
 */
export class NotificationService {
  constructor(
    private db: Database,
    private emailService: EmailService,
    private configRepo: ConfigRepository,
  ) {}

  /**
   * Run H-1 day reminders.
   * Finds Confirmed bookings starting tomorrow, sends reminder email.
   */
  async runDailyReminders(): Promise<{ sent: number; skipped: number; failed: number }> {
    const tomorrow = this.getDateOffset(1);
    const results = { sent: 0, skipped: 0, failed: 0 };

    const eligibleBookings = await this.db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.status, 'Confirmed'),
          eq(bookings.startDate, tomorrow),
          isNull(bookings.reminderDaySentAt),
        ),
      );

    for (const booking of eligibleBookings) {
      try {
        const data = await this.buildReminderData(booking);
        if (!data) {
          results.skipped++;
          continue;
        }

        const sent = await this.emailService.sendBookingReminder(data);
        if (sent) {
          await this.db
            .update(bookings)
            .set({ reminderDaySentAt: new Date().toISOString() })
            .where(eq(bookings.id, booking.id));
          results.sent++;
        } else {
          results.failed++;
        }
      } catch (error) {
        console.error(`[Notification] H-1 reminder failed for ${booking.bookingNumber}:`, error);
        results.failed++;
      }
    }

    console.log(`[Notification] H-1 reminders: sent=${results.sent}, skipped=${results.skipped}, failed=${results.failed}`);
    return results;
  }

  /**
   * Run H-1 hour reminders.
   * Finds Confirmed bookings starting today where reminderHourSentAt is null.
   * Only sends if current time is within reasonable window before pickup.
   */
  async runHourlyReminders(): Promise<{ sent: number; skipped: number; failed: number }> {
    const today = this.getDateOffset(0);
    const results = { sent: 0, skipped: 0, failed: 0 };

    const eligibleBookings = await this.db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.status, 'Confirmed'),
          eq(bookings.startDate, today),
          isNull(bookings.reminderHourSentAt),
        ),
      );

    for (const booking of eligibleBookings) {
      try {
        const data = await this.buildReminderData(booking);
        if (!data) {
          results.skipped++;
          continue;
        }

        // BIZ-14: cron fires hourly, so without this guard a 08:00 pickup got
        // "Dimulai 1 Jam Lagi!" at 00:00 WIB. Only send when pickup is genuinely
        // within the next 1-2 hours. Unparseable pickup time → skip and retry
        // next hour (reminderHourSentAt stays null).
        const pickupMs = this.parsePickupWibMs(booking.startDate, data.pickupTime);
        const msUntilPickup = pickupMs === null ? Number.NaN : pickupMs - Date.now();
        const ONE_HOUR_MS = 60 * 60 * 1000;
        if (!(msUntilPickup > 0 && msUntilPickup <= 2 * ONE_HOUR_MS)) {
          results.skipped++;
          continue;
        }

        const sent = await this.emailService.sendReminderOneHour(data);
        if (sent) {
          await this.db
            .update(bookings)
            .set({ reminderHourSentAt: new Date().toISOString() })
            .where(eq(bookings.id, booking.id));
          results.sent++;
        } else {
          results.failed++;
        }
      } catch (error) {
        console.error(`[Notification] H-1 jam reminder failed for ${booking.bookingNumber}:`, error);
        results.failed++;
      }
    }

    console.log(`[Notification] H-1 jam reminders: sent=${results.sent}, skipped=${results.skipped}, failed=${results.failed}`);
    return results;
  }

  /**
   * Run follow-up + review request emails.
   * Finds Completed bookings that ended yesterday, sends follow-up email.
   */
  async runFollowups(): Promise<{ sent: number; skipped: number; failed: number }> {
    const yesterday = this.getDateOffset(-1);
    const results = { sent: 0, skipped: 0, failed: 0 };

    const eligibleBookings = await this.db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.status, 'Completed'),
          eq(bookings.endDate, yesterday),
          isNull(bookings.followupSentAt),
        ),
      );

    const reviewBaseUrl = await this.configRepo.getValue('review_url') || 'https://savannabromo.com/review';

    for (const booking of eligibleBookings) {
      try {
        const customer = await this.db
          .select()
          .from(customers)
          .where(eq(customers.id, booking.customerId))
          .limit(1);

        const vehicle = await this.db
          .select()
          .from(vehicles)
          .where(eq(vehicles.id, booking.vehicleId))
          .limit(1);

        if (!customer[0] || !vehicle[0] || !customer[0].email) {
          results.skipped++;
          continue;
        }

        const sent = await this.emailService.sendFollowupAndReview({
          customerName: customer[0].name,
          customerEmail: customer[0].email,
          bookingNumber: booking.bookingNumber,
          vehicleName: vehicle[0].name,
          startDate: booking.startDate,
          endDate: booking.endDate,
          reviewUrl: `${reviewBaseUrl}?booking=${booking.bookingNumber}`,
        });

        if (sent) {
          await this.db
            .update(bookings)
            .set({
              followupSentAt: new Date().toISOString(),
              reviewRequestSentAt: new Date().toISOString(),
            })
            .where(eq(bookings.id, booking.id));
          results.sent++;
        } else {
          results.failed++;
        }
      } catch (error) {
        console.error(`[Notification] Follow-up failed for ${booking.bookingNumber}:`, error);
        results.failed++;
      }
    }

    console.log(`[Notification] Follow-ups: sent=${results.sent}, skipped=${results.skipped}, failed=${results.failed}`);
    return results;
  }

  // ===== PRIVATE HELPERS =====

  private async buildReminderData(booking: {
    bookingNumber: string;
    customerId: string;
    vehicleId: string;
    startDate: string;
    endDate: string;
  }) {
    const customer = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, booking.customerId))
      .limit(1);

    const vehicle = await this.db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, booking.vehicleId))
      .limit(1);

    if (!customer[0] || !vehicle[0] || !customer[0].email) {
      return null;
    }

    const pickupTime = await this.configRepo.getValue('pickup_time') || '08:00 WIB';
    const pickupLocation = await this.configRepo.getValue('pickup_location') || 'Kantor Savanna Bromo Rental';

    return {
      customerName: customer[0].name,
      customerEmail: customer[0].email,
      bookingNumber: booking.bookingNumber,
      vehicleName: vehicle[0].name,
      startDate: booking.startDate,
      endDate: booking.endDate,
      pickupTime,
      pickupLocation,
    };
  }

  /**
   * Return a YYYY-MM-DD date offset by `days` from today, computed in WIB
   * (UTC+7) — the business timezone — not UTC. Bookings store calendar dates
   * in WIB, so comparing against UTC dates caused H-1 reminders to fire on
   * the pickup day. The cron runs at 22:00 UTC (05:00 WIB); using UTC here
   * would already be "tomorrow" in WIB for part of the window.
   */
  private getDateOffset(days: number): string {
    const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
    const now = new Date();
    // Shift to WIB wall-clock, then apply the day offset
    const wib = new Date(now.getTime() + WIB_OFFSET_MS);
    wib.setUTCDate(wib.getUTCDate() + days);
    return wib.toISOString().split('T')[0];
  }

  /**
   * BIZ-14 helper: combine a WIB calendar date (YYYY-MM-DD) with a pickup time
   * string like "08:00 WIB" into a UTC epoch-ms instant. Returns null when the
   * time cannot be parsed, so callers skip instead of sending at a wrong hour.
   */
  private parsePickupWibMs(date: string, pickupTime: string): number | null {
    const m = pickupTime.match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (hh > 23 || mm > 59) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    const ms = Date.parse(`${date}T${pad(hh)}:${pad(mm)}:00+07:00`);
    return Number.isNaN(ms) ? null : ms;
  }
}
