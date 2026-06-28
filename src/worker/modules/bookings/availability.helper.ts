import { and, eq, inArray, lt, gt, not } from 'drizzle-orm';
import { bookings, type Booking } from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';

/**
 * Availability Helper
 *
 * Provides utility functions for checking vehicle availability.
 * Uses "end date exclusive" logic: a booking ending on day X doesn't block
 * a new booking starting on day X (allows morning return, afternoon pickup).
 */

export interface ConflictingBooking {
	id: string;
	bookingNumber: string;
	startDate: string;
	endDate: string;
	status: Booking['status'];
}

export interface AvailabilityCheck {
	isAvailable: boolean;
	conflictingBookings: ConflictingBooking[];
}

/**
 * Check if two date ranges overlap (end date exclusive)
 *
 * Logic: Ranges overlap if:
 * - Existing booking starts before new period ends (existing.startDate < new.endDate)
 * - AND existing booking ends after new period starts (existing.endDate > new.startDate)
 *
 * Example: Booking Mar 5-8 and new request Mar 8-10 do NOT conflict
 * because the first booking ends on Mar 8 (exclusive), allowing pickup on Mar 8.
 */
export function datesOverlap(
	existingStart: string,
	existingEnd: string,
	newStart: string,
	newEnd: string
): boolean {
	// End date exclusive: existing.end > new.start AND existing.start < new.end
	return existingEnd > newStart && existingStart < newEnd;
}

/**
 * Find all bookings that conflict with the given date range for a vehicle
 */
export async function findConflictingBookings(
	db: Database,
	vehicleId: string,
	startDate: string,
	endDate: string,
	excludeBookingId?: string
): Promise<ConflictingBooking[]> {
	// Only check against confirmed and active bookings
	const conflictingStatuses: Booking['status'][] = ['Confirmed', 'Active'];

	const conditions = [
		eq(bookings.vehicleId, vehicleId),
		inArray(bookings.status, conflictingStatuses),
		// End date exclusive overlap check
		lt(bookings.startDate, endDate),  // Existing starts before new ends
		gt(bookings.endDate, startDate),   // Existing ends after new starts
	];

	if (excludeBookingId) {
		conditions.push(not(eq(bookings.id, excludeBookingId)));
	}

	const results = await db
		.select({
			id: bookings.id,
			bookingNumber: bookings.bookingNumber,
			startDate: bookings.startDate,
			endDate: bookings.endDate,
			status: bookings.status,
		})
		.from(bookings)
		.where(and(...conditions));

	return results;
}

/**
 * Check if a vehicle is available for the given date range
 */
export async function checkVehicleAvailability(
	db: Database,
	vehicleId: string,
	startDate: string,
	endDate: string,
	excludeBookingId?: string
): Promise<AvailabilityCheck> {
	const conflictingBookings = await findConflictingBookings(
		db,
		vehicleId,
		startDate,
		endDate,
		excludeBookingId
	);

	return {
		isAvailable: conflictingBookings.length === 0,
		conflictingBookings,
	};
}

/**
 * Calculate the number of 12-hour blocks in a rental period
 * Minimum 1 block (12 hours). E.g., 2026-06-28 to 2026-06-29 = 2 blocks (24h).
 */
export function calculateDays(startDate: string, endDate: string): number {
	return calculateTwelveHourBlocks(startDate, endDate);
}

/**
 * Calculate 12-hour rental blocks.
 * Uses ceil rounding: a13-hour rental = 2 blocks.
 */
export const HOURS_PER_BLOCK = 12;

export function calculateTwelveHourBlocks(startDate: string, endDate: string): number {
	const start = new Date(startDate);
	const end = new Date(endDate);
	const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
	const blocks = Math.ceil(diffHours / HOURS_PER_BLOCK);
	return Math.max(1, blocks); // Minimum 1 block
}

/** Hourly rate derived from the stored dailyRate (which now means rate per12-hour block) */
export function getHourlyRate(dailyRate: number): number {
	return dailyRate / HOURS_PER_BLOCK;
}

/**
 * Generate a unique booking number
 * Format: SM-{YYYYMMDD}-{6-char-nanoid}
 */
export function generateBookingNumber(): string {
	const date = new Date();
	const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
	const randomStr = generateNanoid(6);
	return `SM-${dateStr}-${randomStr}`;
}

/**
 * Simple nanoid implementation (no external dependency)
 * Generates URL-safe random string
 */
function generateNanoid(length: number): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	const randomValues = new Uint8Array(length);
	crypto.getRandomValues(randomValues);
	for (let i = 0; i < length; i++) {
		result += chars[randomValues[i] % chars.length];
	}
	return result;
}

/**
 * Calculate late fee in hours (was daily).
 * Formula: hoursLate * hourlyRate * LATE_FEE_MULTIPLIER
 * hourlyRate = dailyRate / 12
 */
export const LATE_FEE_MULTIPLIER = 1.5;

export function calculateLateFee(
	dailyRate: number,
	endDate: string,
	actualReturnDate: string
): { daysLate: number; lateFee: number; hoursLate: number } {
	const end = new Date(endDate);
	const actual = new Date(actualReturnDate);
	const diffMs = actual.getTime() - end.getTime();
	const hoursLate = Math.ceil(diffMs / (1000 * 60 * 60));

	if (hoursLate <= 0) {
		return { daysLate: 0, lateFee: 0, hoursLate: 0 };
	}

	const hourlyRate = getHourlyRate(dailyRate);
	const lateFee = hoursLate * hourlyRate * LATE_FEE_MULTIPLIER;
	return { daysLate: Math.ceil(hoursLate / 24), lateFee, hoursLate };
}
