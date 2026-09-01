import { BookingsRepository } from './bookings.repository';
import { VehiclesRepository } from '../vehicles/vehicles.repository';
import { CustomersRepository } from '../customers/customers.repository';
import { ChecklistsRepository } from '../checklists/checklists.repository';
import { VehicleConditionsRepository } from './vehicle-conditions.repository';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { MaintenanceRepository } from '../maintenance/maintenance.repository';
import { ConflictError, NotFoundError, ValidationError, ForbiddenError } from '@/worker/core/types/errors';
import {
	generateBookingNumber,
	calculateDays,
	calculateTwelveHourBlocks,
	calculateLateFee,
	getHourlyRate,
	LATE_FEE_MULTIPLIER,
} from './availability.helper';
import { decodeVehicleQr } from '@/worker/core/lib/qr';
import { BOOKING_STATUS_TRANSITIONS } from './bookings.types';
import type {
	BookingResponse,
	BookingWithDetails,
	BookingListItem,
	CustomerSummary,
	VehicleSummary,
	AddonResponse,
	PaymentSummary,
	PaymentInBooking,
	LateFeeDetails,
	CompleteRentalResult,
	ExtendRentalResult,
	AvailabilityResult,
	BookingStats,
	BookingStatus,
	PenaltyBreakdown,
	QrScanResult,
} from './bookings.types';
import type {
	CreateBookingRequest,
	UpdateBookingRequest,
	StartRentalRequest,
	CompleteRentalRequest,
	ExtendRentalRequest,
	ListBookingsQuery,
	AvailabilityQuery,
	AddAddonRequest,
	SubmitChecklistRequest,
} from './bookings.dto';
import type { Booking, Vehicle } from '@/worker/core/database/schema';

export class BookingsService {
	// ── History ──

	async getBookingHistory(bookingId: string) {
		return this.bookingRepo.getBookingHistory(bookingId);
	}

	// ── Helpers ──

	private normalizePlateNumber(value: string): string {
		return value.trim().toUpperCase().replace(/\s+/g, ' ');
	}

	private async resolveVehicleFromScan(raw: string): Promise<Vehicle> {
		const vehicleId = decodeVehicleQr(raw);
		if (vehicleId) {
			const byId = await this.vehicleRepo.findById(vehicleId);
			if (byId) return byId;
		}

		const normalizedPlate = this.normalizePlateNumber(raw);
		const byPlate = await this.vehicleRepo.findByPlateNumber(normalizedPlate);
		if (byPlate) return byPlate;

		throw new NotFoundError('Vehicle');
	}

	/** Get cleaning duration in hours from config (default 4 hours) */
	private async getCleaningDurationHours(): Promise<number> {
		if (!this.configRepo) return 4;
		return this.configRepo.getNumber('cleaning_duration_hours', 4);
	}

	constructor(
		private bookingRepo: BookingsRepository,
		private vehicleRepo: VehiclesRepository,
		private customerRepo: CustomersRepository,
		private checklistRepo?: ChecklistsRepository,
		private configRepo?: ConfigRepository,
		private conditionsRepo?: VehicleConditionsRepository,
		private maintenanceRepo?: MaintenanceRepository,
	) {}

	/**
	 * Admin scans a vehicle QR to resolve the active rental for return processing.
	 * Resolve-only: the admin UI then opens the Complete dialog (POST /:id/complete)
	 * so completeRental stays the single source of truth for penalties + vehicle status.
	 */
	async scanReturn(qrCode: string): Promise<{
		bookingId: string;
		bookingNumber: string;
		vehicleId: string;
		vehicleName: string;
		customerName: string;
		status: string;
		startDate: string;
		endDate: string;
	}> {
		const vehicle = await this.resolveVehicleFromScan(qrCode);

		const booking = await this.bookingRepo.findActiveByVehicle(vehicle.id);
		if (!booking) {
			throw new NotFoundError('Tidak ada rental aktif untuk kendaraan ini');
		}

		const [freshVehicle, customer] = await Promise.all([
			this.vehicleRepo.findById(vehicle.id),
			this.customerRepo.findById(booking.customerId),
		]);

		return {
			bookingId: booking.id,
			bookingNumber: booking.bookingNumber,
			vehicleId: booking.vehicleId,
			vehicleName: freshVehicle?.name ?? vehicle.name,
			customerName: customer?.name ?? 'Unknown',
			status: booking.status,
			startDate: booking.startDate,
			endDate: booking.endDate,
		};
	}

	// Transform addon to response format
	private toAddonResponse(addon: { id: string; type: string; description: string | null; amount: number; isMandatory: boolean | null }): AddonResponse {
		return {
			id: addon.id,
			type: addon.type as AddonResponse['type'],
			description: addon.description,
			amount: addon.amount,
			isMandatory: addon.isMandatory ?? false,
		};
	}

	// Transform booking to response format
	private async toResponse(booking: Booking): Promise<BookingResponse> {
		const details = await this.bookingRepo.getBookingWithDetails(booking.id);
		if (!details) {
			throw new NotFoundError('Booking details');
		}

		const customerSummary: CustomerSummary = {
			id: details.customer.id,
			name: details.customer.name,
			phone: details.customer.phone,
			email: details.customer.email,
			isBlacklisted: details.customer.isBlacklisted,
		};

		const vehicleSummary: VehicleSummary = {
			id: details.vehicle.id,
			name: details.vehicle.name,
			plateNumber: details.vehicle.plateNumber,
			type: details.vehicle.type,
			dailyRateIdr: details.vehicle.dailyRateIdr,
		};

		// Fetch status change history
		const statusHistory = await this.bookingRepo.getBookingHistory(booking.id);

		return {
			id: booking.id,
			bookingNumber: booking.bookingNumber,
			customer: customerSummary,
			vehicle: vehicleSummary,
			startDate: booking.startDate,
			endDate: booking.endDate,
			actualReturnDate: booking.actualReturnDate,
			startKm: booking.startKm,
			endKm: booking.endKm,
			status: booking.status,
			paymentTerms: booking.paymentTerms,
			baseAmount: booking.baseAmount,
			addonsAmount: booking.addonsAmount ?? 0,
			lateFee: booking.lateFee ?? 0,
			damageFee: booking.damageFee ?? 0,
			totalPenalty: booking.totalPenalty ?? 0,
			penaltyPaid: booking.penaltyPaid ?? false,
			returnConfirmed: booking.returnConfirmed ?? false,
			totalAmount: booking.totalAmount,
			statusHistory,
			currency: booking.currency,
			notes: booking.notes,
			createdAt: booking.createdAt,
			updatedAt: booking.updatedAt,
		};
	}

	// Calculate payment summary for a booking
	private async getPaymentSummary(bookingId: string): Promise<PaymentSummary> {
		const payments = await this.bookingRepo.getPaymentsByBookingId(bookingId);
		const booking = await this.bookingRepo.findById(bookingId);

		if (!booking) {
			return { totalPaid: 0, pendingAmount: 0, remaining: 0, isFullyPaid: false };
		}

		let totalPaid = 0;
		let pendingAmount = 0;

		for (const payment of payments) {
			if (payment.status === 'Verified') {
				totalPaid += payment.amount;
			} else if (payment.status === 'Pending') {
				pendingAmount += payment.amount;
			}
		}

		const remaining = Math.max(0, booking.totalAmount - totalPaid);
		const isFullyPaid = totalPaid >= booking.totalAmount;

		return { totalPaid, pendingAmount, remaining, isFullyPaid };
	}

	// Validate status transition
	private validateStatusTransition(currentStatus: BookingStatus, newStatus: BookingStatus): void {
		const allowedTransitions = BOOKING_STATUS_TRANSITIONS[currentStatus];
		if (!allowedTransitions.includes(newStatus)) {
			throw new ValidationError(
				`Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(', ') || 'none'}`
			);
		}
	}

	// Assert booking is not in terminal state
	private assertNotTerminal(booking: Booking, operation: string): void {
		if (booking.status === 'Completed' || booking.status === 'Cancelled') {
			throw new ForbiddenError(`Cannot ${operation} on a ${booking.status.toLowerCase()} booking`);
		}
	}

	// Check availability using repository method
	private async checkVehicleAvailability(
		vehicleId: string,
		startDate: string,
		endDate: string,
		excludeBookingId?: string
	): Promise<{ isAvailable: boolean; conflictingBookings: { id: string; bookingNumber: string; startDate: string; endDate: string }[] }> {
		const conflictingBookings = await this.bookingRepo.findConflictingBookings(
			vehicleId,
			startDate,
			endDate,
			excludeBookingId
		);

		return {
			isAvailable: conflictingBookings.length === 0,
			conflictingBookings: conflictingBookings.map(b => ({
				id: b.id,
				bookingNumber: b.bookingNumber,
				startDate: b.startDate,
				endDate: b.endDate,
			})),
		};
	}

	async list(query: ListBookingsQuery): Promise<{
		items: BookingListItem[];
		meta: { page: number; limit: number; total: number; totalPages: number };
	}> {
		const { items, total } = await this.bookingRepo.list(query);
		const totalPages = Math.ceil(total / query.limit);

		const listItems: BookingListItem[] = await Promise.all(
			items.map(async (booking) => {
				const response = await this.toResponse(booking);
				const paymentStatus = await this.getPaymentSummary(booking.id);
				return { ...response, paymentStatus };
			})
		);

		return {
			items: listItems,
			meta: {
				page: query.page,
				limit: query.limit,
				total,
				totalPages,
			},
		};
	}

	async getById(id: string): Promise<BookingWithDetails | null> {
		const booking = await this.bookingRepo.findById(id);
		if (!booking) return null;

		const details = await this.bookingRepo.getBookingWithDetails(id);
		if (!details) return null;

		const response = await this.toResponse(booking);

		// Get addons
		const addons = await this.bookingRepo.getAddons(id);
		const addonResponses: AddonResponse[] = addons.map(this.toAddonResponse);

		// Get payments
		const payments = await this.bookingRepo.getPaymentsByBookingId(id);
		const paymentResponses: PaymentInBooking[] = payments.map((p) => ({
			id: p.id,
			amount: p.amount,
			method: p.method,
			status: p.status,
			createdAt: p.createdAt,
		}));

		// Get payment summary
		const paymentSummary = await this.getPaymentSummary(id);

		return {
			...response,
			addons: addonResponses,
			payments: paymentResponses,
			paymentSummary,
			createdBy: details.creator,
		};
	}

	async getByNumber(bookingNumber: string): Promise<BookingWithDetails | null> {
		const booking = await this.bookingRepo.findByBookingNumber(bookingNumber);
		if (!booking) return null;
		return this.getById(booking.id);
	}

	async create(data: CreateBookingRequest, userId: string): Promise<{
		booking: BookingResponse;
		blacklistWarning: { isBlacklisted: boolean; reason: string | null } | null;
		availabilityWarning: { message: string } | null;
	}> {
		// Validate customer exists
		const customer = await this.customerRepo.findById(data.customerId);
		if (!customer) {
			throw new NotFoundError('Customer');
		}

		// Validate vehicle exists
		const vehicle = await this.vehicleRepo.findById(data.vehicleId);
		if (!vehicle) {
			throw new NotFoundError('Vehicle');
		}

		// Check if vehicle is in maintenance or inactive
		if (vehicle.status === 'Maintenance') {
			throw new ConflictError('Vehicle is currently under maintenance');
		}
		if (vehicle.status === 'Inactive') {
			throw new ConflictError('Vehicle is inactive');
		}

		// Check availability using repository method
		const availability = await this.checkVehicleAvailability(
			data.vehicleId,
			data.startDate,
			data.endDate
		);

		if (!availability.isAvailable) {
			throw new ConflictError(
				`Vehicle is not available for the selected dates. Conflicting booking: ${availability.conflictingBookings[0]?.bookingNumber}`
			);
		}

		const availabilityWarning: { message: string } | null = null;

		// Check blacklist status
		let blacklistWarning: { isBlacklisted: boolean; reason: string | null } | null = null;
		if (customer.isBlacklisted) {
			blacklistWarning = {
				isBlacklisted: true,
				reason: customer.blacklistReason,
			};
		}

		// Calculate amounts (12-hour block pricing, not daily)
		const blocks = calculateDays(data.startDate, data.endDate);
		const blockRate = data.currency === 'USD' ? (vehicle.dailyRateUsd ?? 0) : vehicle.dailyRateIdr;

		// Validate block rate exists
		if (blockRate === 0) {
			throw new ValidationError(
				`Vehicle does not have a ${data.currency} rate configured`
			);
		}

		// C1: round to whole rupiah to avoid float drift
		const baseAmount = Math.round(blockRate * blocks);

		// Calculate addons amount
		let addonsAmount = 0;
		for (const addon of data.addons ?? []) {
			addonsAmount += addon.amount;
		}
		addonsAmount = Math.round(addonsAmount);

		const totalAmount = Math.round(baseAmount + addonsAmount);

		// Generate booking number
		const bookingNumber = generateBookingNumber();

		// B1: re-verify availability immediately before insert to narrow the
		// TOCTOU window (D1 has no transactions). A concurrent booking that
		// slipped in between the first check and here will be caught.
		const recheck = await this.bookingRepo.findConflictingBookings(
			data.vehicleId,
			data.startDate,
			data.endDate,
		);
		if (recheck.length > 0) {
			throw new ConflictError(
				`Vehicle was just booked for these dates. Conflicting booking: ${recheck[0]?.bookingNumber}`,
			);
		}

		// Create booking
		const booking = await this.bookingRepo.create({
			bookingNumber,
			customerId: data.customerId,
			vehicleId: data.vehicleId,
			startDate: data.startDate,
			endDate: data.endDate,
			status: 'Pending',
			paymentTerms: data.paymentTerms,
			baseAmount,
			addonsAmount,
			lateFee: 0,
			totalAmount,
			currency: data.currency,
			notes: data.notes ?? null,
			createdBy: userId,
		});

		// Log initial status
		await this.bookingRepo.logStatusChange(booking.id, null, 'Pending', userId, 'Booking created');

		// Create addons
		for (const addon of data.addons ?? []) {
			await this.bookingRepo.createAddon({
				bookingId: booking.id,
				type: addon.type,
				description: addon.description ?? null,
				amount: addon.amount,
				isMandatory: addon.isMandatory,
			});
		}

		const response = await this.toResponse(booking);
		return { booking: response, blacklistWarning, availabilityWarning };
	}

	async update(id: string, data: UpdateBookingRequest): Promise<BookingResponse> {
		const booking = await this.bookingRepo.findById(id);
		if (!booking) {
			throw new NotFoundError('Booking');
		}

		this.assertNotTerminal(booking, 'update');

		// Build update payload
		const updateData: Record<string, unknown> = {};

		if (data.notes !== undefined) updateData.notes = data.notes;

		// Handle vehicle change
		if (data.vehicleId && data.vehicleId !== booking.vehicleId) {
			const newVehicle = await this.vehicleRepo.findById(data.vehicleId);
			if (!newVehicle) throw new ValidationError('Vehicle not found');
			if (newVehicle.status !== 'Available') throw new ValidationError('Target vehicle is not available');
			updateData.vehicleId = data.vehicleId;
		}

		// Handle date/vehicle change - re-check availability + re-price.
		// Exclude the current booking so editing an existing row does not
		// conflict with itself.
		const newStart = data.startDate ?? booking.startDate;
		const newEnd = data.endDate ?? booking.endDate;
		const targetVehicleId = (updateData.vehicleId as string | undefined) ?? booking.vehicleId;
		if (data.startDate || data.endDate || updateData.vehicleId) {
			if (newStart > newEnd) throw new ValidationError('End date must be after start date');
			const availability = await this.checkVehicleAvailability(
				targetVehicleId,
				newStart,
				newEnd,
				id,
			);
			if (!availability.isAvailable) throw new ConflictError('Vehicle is not available for the selected dates');
			updateData.startDate = newStart;
			updateData.endDate = newEnd;
			const vehicle = await this.vehicleRepo.findById(targetVehicleId);
			if (!vehicle) throw new ValidationError('Vehicle not found');
			updateData.baseAmount = Math.round(vehicle.dailyRateIdr * calculateTwelveHourBlocks(newStart, newEnd));
		}

		const updated = await this.bookingRepo.update(id, updateData as any);

		if (!updated) {
			throw new NotFoundError('Booking');
		}

		return this.toResponse(updated);
	}

	async confirm(id: string): Promise<BookingResponse> {
		const booking = await this.bookingRepo.findById(id);
		if (!booking) {
			throw new NotFoundError('Booking');
		}

		this.validateStatusTransition(booking.status, 'Confirmed');

		const updated = await this.bookingRepo.confirm(id);
		if (!updated) {
			throw new NotFoundError('Booking');
		}
		await this.bookingRepo.logStatusChange(id, 'Pending', 'Confirmed');

		return this.toResponse(updated);
	}

	async startRental(id: string, data: StartRentalRequest): Promise<BookingResponse> {
		const booking = await this.bookingRepo.findById(id);
		if (!booking) {
			throw new NotFoundError('Booking');
		}

		// Validate pickup checklist exists
		let pickupChecklistId: string | undefined;
		if (this.checklistRepo) {
			const pickupChecklist = await this.checklistRepo.findByBookingAndType(booking.id, 'pickup');
			if (!pickupChecklist) {
				throw new ValidationError('Checklist pickup wajib diisi sebelum memulai rental');
			}
			pickupChecklistId = pickupChecklist.id;
		}

		this.validateStatusTransition(booking.status, 'Active');

		// Validate start km
		if (data.startKm < 0) {
			throw new ValidationError('Start KM must be a non-negative number');
		}

		// Update booking with start km + mark pickup confirmed
		const updated = await this.bookingRepo.startRental(id, { startKm: data.startKm, pickupChecklistId });
		if (!updated) {
			throw new NotFoundError('Booking');
		}
		await this.bookingRepo.logStatusChange(id, 'Confirmed', 'Active');

		// Update vehicle status to Rented
		await this.vehicleRepo.updateStatus(booking.vehicleId, 'Rented');

		return this.toResponse(updated);
	}

	async completeRental(id: string, data: CompleteRentalRequest): Promise<CompleteRentalResult> {
		const booking = await this.bookingRepo.findById(id);
		if (!booking) {
			throw new NotFoundError('Booking');
		}

		// Check if already completed
		if (booking.status === 'Completed') {
			throw new ValidationError('Rental is already completed');
		}

		// Validate return checklist exists + load pickup checklist for damage comparison
		let returnChecklistId: string | undefined;
		let returnCheckedBy: string | null = null;
		let pickupItems: Record<string, boolean> = {};
		let returnItems: Record<string, boolean> = {};
		if (this.checklistRepo) {
			const returnChecklist = await this.checklistRepo.findByBookingAndType(booking.id, 'return');
			if (!returnChecklist) {
				throw new ValidationError('Checklist return wajib diisi sebelum menyelesaikan rental');
			}
			returnChecklistId = returnChecklist.id;
			returnCheckedBy = returnChecklist.createdBy;
			returnItems = BookingsService.parseChecklistItems(returnChecklist.items);
			const pickupChecklist = await this.checklistRepo.findByBookingAndType(booking.id, 'pickup');
			if (pickupChecklist) {
				pickupItems = BookingsService.parseChecklistItems(pickupChecklist.items);
			}
		}

		this.validateStatusTransition(booking.status, 'Completed');

		// Validate start km exists
		if (booking.startKm === null || booking.startKm === undefined) {
			throw new ValidationError('Cannot complete rental - start KM not recorded. Please start the rental first.');
		}

		// Validate end km is greater than start km
		if (data.endKm <= booking.startKm) {
			throw new ValidationError(`End KM (${data.endKm}) must be greater than start KM (${booking.startKm})`);
		}

		// Get vehicle for daily rate
		const vehicle = await this.vehicleRepo.findById(booking.vehicleId);
		if (!vehicle) {
			throw new NotFoundError('Vehicle');
		}

		// C2: use the rate matching the booking's currency (was always IDR)
		const lateRate = booking.currency === 'USD' ? (vehicle.dailyRateUsd ?? 0) : vehicle.dailyRateIdr;
		// Calculate late fee - hourly based now
		const { daysLate, lateFee, hoursLate } = calculateLateFee(
			lateRate,
			booking.endDate,
			data.actualReturnDate
		);

		// Damage detection: items that were OK (true) at pickup but NOT OK (false) at return.
		// Flat rate per damaged item (configurable); admin may override the total.
		const flippedItems = BookingsService.countFlippedItems(pickupItems, returnItems);
		const ratePerItem = await this.getDamagePerItem();
		const override = data.damageFeeOverride != null;
		const damageFee = override ? (data.damageFeeOverride as number) : flippedItems * ratePerItem;
		const totalPenalty = lateFee + damageFee;

		// Calculate new total by adding late fee to current total (C1: round; damage fee tracked separately)
		const newTotalAmount = Math.round(booking.totalAmount + lateFee);

		// Update booking
		const updated = await this.bookingRepo.completeRental(id, {
			actualReturnDate: data.actualReturnDate,
			endKm: data.endKm,
			lateFee,
			totalAmount: newTotalAmount,
			damageFee,
			totalPenalty,
			returnChecklistId,
		});

		if (!updated) {
			throw new NotFoundError('Booking');
		}
		await this.bookingRepo.logStatusChange(id, 'Active', 'Completed');

		// Derive condition status (admin override wins) and update vehicle
		const conditionStatus = (data.conditionStatus
			?? (flippedItems === 0 && daysLate === 0 ? 'Excellent' : flippedItems > 0 ? 'Fair' : 'Good')) as NonNullable<Vehicle['conditionStatus']>;

		// B4: if the vehicle has active maintenance, preserve that state instead
		// of Sending it to Cleaning (completeRental would otherwise clobber it).
		const hasActiveMaintenance =
			this.maintenanceRepo && (await this.maintenanceRepo.findActiveByVehicleId(booking.vehicleId)) !== null;

		// Otherwise vehicle goes to Cleaning, not Available directly
		const cleaningDurationHours = hasActiveMaintenance ? 0 : await this.getCleaningDurationHours();
		const cleaningCompletedAt = hasActiveMaintenance
			? null
			: new Date(Date.now() + cleaningDurationHours * 60 * 60 * 1000).toISOString();

		await this.vehicleRepo.update(booking.vehicleId, {
			status: hasActiveMaintenance ? 'Maintenance' : 'Cleaning',
			totalKm: data.endKm,
			lastKm: data.endKm,
			conditionStatus,
			cleaningCompletedAt,
		});

		// Record condition history
		if (this.conditionsRepo) {
			await this.conditionsRepo.create({
				vehicleId: booking.vehicleId,
				checklistId: returnChecklistId,
				conditionStatus,
				notes: data.returnNotes ?? data.damageNotes ?? null,
				km: data.endKm,
				checkedAt: new Date().toISOString(),
				checkedBy: returnCheckedBy,
			});
		}

		const response = await this.toResponse(updated);

		let lateFeeDetails: LateFeeDetails | null = null;
		if (hoursLate > 0) {
			lateFeeDetails = {
				daysLate,
				dailyRate: vehicle.dailyRateIdr,
				multiplier: LATE_FEE_MULTIPLIER,
				calculation: `${hoursLate} hour(s) late x Rp${Math.round(getHourlyRate(vehicle.dailyRateIdr))}/hour x ${LATE_FEE_MULTIPLIER} = Rp${Math.round(lateFee).toLocaleString('id-ID')}`,
			};
		}

		const damageFeeDetails = flippedItems > 0 || override
			? {
					flippedItems,
					ratePerItem,
					override,
					calculation: override
						? `Admin override = ${damageFee}`
						: `${flippedItems} damaged item(s) x ${ratePerItem} = ${damageFee}`,
				}
			: null;

		return {
			...response,
			lateFeeDetails,
			damageFeeDetails,
			vehicleStatus: 'Available',
		};
	}

	async extend(id: string, data: ExtendRentalRequest): Promise<ExtendRentalResult> {
		const booking = await this.bookingRepo.findById(id);
		if (!booking) {
			throw new NotFoundError('Booking');
		}

		// Can only extend active bookings
		if (booking.status !== 'Active') {
			throw new ValidationError('Can only extend active bookings');
		}

		// Validate new end date is after current
		if (data.newEndDate <= booking.endDate) {
			throw new ValidationError('New end date must be after current end date');
		}

		// Check availability for the extended period using repository method
		const availability = await this.checkVehicleAvailability(
			booking.vehicleId,
			booking.endDate, // Start checking from current end date
			data.newEndDate,
			id // Exclude current booking
		);

		if (!availability.isAvailable) {
			throw new ConflictError(
				`Vehicle is not available for the extended period. Conflicting booking: ${availability.conflictingBookings[0]?.bookingNumber}`
			);
		}

		// Calculate additional blocks (12-hour based)
		const vehicle = await this.vehicleRepo.findById(booking.vehicleId);
		if (!vehicle) {
			throw new NotFoundError('Vehicle');
		}

		const additionalBlocks = calculateDays(booking.endDate, data.newEndDate);
		// C2: use the rate matching the booking's currency (was always IDR); C1: round
		const extRate = booking.currency === 'USD' ? (vehicle.dailyRateUsd ?? 0) : vehicle.dailyRateIdr;
		const additionalAmount = Math.round(extRate * additionalBlocks);
		const newTotalAmount = Math.round(booking.totalAmount + additionalAmount);

		// Update booking
		const originalEndDate = booking.endDate;
		await this.bookingRepo.extend(id, data.newEndDate, newTotalAmount);

		return {
			id,
			originalEndDate,
			newEndDate: data.newEndDate,
			additionalBlocks,
			additionalAmount,
			newTotalAmount,
			extendedAt: new Date().toISOString(),
		};
	}

	async cancel(id: string, reason: string): Promise<BookingResponse> {
		const booking = await this.bookingRepo.findById(id);
		if (!booking) {
			throw new NotFoundError('Booking');
		}

		this.validateStatusTransition(booking.status, 'Cancelled');

		// If booking was active, set vehicle back to available
		if (booking.status === 'Active') {
			await this.vehicleRepo.updateStatus(booking.vehicleId, 'Available');
		}

		// B5: cancel associated payments so they don't linger as Verified
		// revenue on a cancelled booking.
		await this.bookingRepo.cancelPendingPaymentsByBookingId(id);

		// BIZ-03: return held equipment stock to inventory (public bookings
		// decrement stock on create; restore here so cancellations release it).
		for (const row of await this.bookingRepo.listBookingEquipment(id)) {
			await this.bookingRepo.restoreEquipmentStock(row.equipmentId, row.quantity);
		}

		// Update booking with cancellation reason in notes
		const updated = await this.bookingRepo.update(id, {
			status: 'Cancelled',
			cancelledAt: new Date().toISOString(),
			notes: booking.notes ? `${booking.notes}\n\nCancellation reason: ${reason}` : `Cancellation reason: ${reason}`,
		});

		if (!updated) {
			throw new NotFoundError('Booking');
		}
		await this.bookingRepo.logStatusChange(id, booking.status, 'Cancelled', undefined, reason);

		return this.toResponse(updated);
	}

	async addAddon(id: string, data: AddAddonRequest): Promise<{ addon: AddonResponse; newTotalAmount: number }> {
		const booking = await this.bookingRepo.findById(id);
		if (!booking) {
			throw new NotFoundError('Booking');
		}

		this.assertNotTerminal(booking, 'add addons to');

		const addon = await this.bookingRepo.createAddon({
			bookingId: id,
			type: data.type,
			description: data.description ?? null,
			amount: data.amount,
			isMandatory: data.isMandatory,
		});

		// D1: re-fetch the booking after the addon insert so concurrent addon
		// adds are reflected in the recomputed totals (avoids lost update).
		const refreshed = await this.bookingRepo.findById(id);
		const newAddonsAmount = (refreshed?.addonsAmount ?? booking.addonsAmount ?? 0) + data.amount;
		const newTotalAmount = Math.round((refreshed?.baseAmount ?? booking.baseAmount) + newAddonsAmount + (refreshed?.lateFee ?? booking.lateFee ?? 0));
		await this.bookingRepo.updateAddonsAmount(id, newAddonsAmount, newTotalAmount);

		return {
			addon: this.toAddonResponse(addon),
			newTotalAmount,
		};
	}

	async removeAddon(id: string, addonId: string): Promise<{ removedAddonId: string; newTotalAmount: number }> {
		const booking = await this.bookingRepo.findById(id);
		if (!booking) {
			throw new NotFoundError('Booking');
		}

		this.assertNotTerminal(booking, 'remove addons from');

		// Get addon to find its amount
		const addons = await this.bookingRepo.getAddons(id);
		const addon = addons.find((a) => a.id === addonId);
		if (!addon) {
			throw new NotFoundError('Addon');
		}

		// Remove addon
		await this.bookingRepo.deleteAddon(id, addonId);

		// D1: re-fetch after delete to avoid lost update on concurrent ops
		const refreshed = await this.bookingRepo.findById(id);
		const newAddonsAmount = (refreshed?.addonsAmount ?? booking.addonsAmount ?? 0) - addon.amount;
		const newTotalAmount = Math.round((refreshed?.baseAmount ?? booking.baseAmount) + newAddonsAmount + (refreshed?.lateFee ?? booking.lateFee ?? 0));
		await this.bookingRepo.updateAddonsAmount(id, newAddonsAmount, newTotalAmount);

		return { removedAddonId: addonId, newTotalAmount };
	}

	async checkAvailability(query: AvailabilityQuery): Promise<AvailabilityResult> {
		// Get vehicles to check
		let vehicles: Vehicle[] = [];
		if (query.vehicleId) {
			const vehicle = await this.vehicleRepo.findById(query.vehicleId);
			if (vehicle) vehicles = [vehicle];
		} else {
			vehicles = await this.vehicleRepo.getAvailableVehicles(query.type);
		}

		const availableVehicles: AvailabilityResult['availableVehicles'] = [];
		const unavailableVehicles: AvailabilityResult['unavailableVehicles'] = [];
		const maintenanceVehicles: AvailabilityResult['maintenanceVehicles'] = [];

		for (const vehicle of vehicles) {
			if (vehicle.status === 'Maintenance') {
				maintenanceVehicles.push({
					id: vehicle.id,
					name: vehicle.name,
					reason: 'Under maintenance',
				});
				continue;
			}

			if (vehicle.status === 'Inactive') {
				continue; // Skip inactive vehicles
			}

			// Use repository method for availability check
			const availability = await this.checkVehicleAvailability(
				vehicle.id,
				query.startDate,
				query.endDate
			);

			if (availability.isAvailable) {
				availableVehicles.push({
					id: vehicle.id,
					name: vehicle.name,
					type: vehicle.type,
					dailyRateIdr: vehicle.dailyRateIdr,
					plateNumber: vehicle.plateNumber,
				});
			} else {
				const conflict = availability.conflictingBookings[0];
				unavailableVehicles.push({
					id: vehicle.id,
					name: vehicle.name,
					reason: 'Already booked',
					conflictingBooking: conflict,
				});
			}
		}

		return {
			requestedPeriod: {
				startDate: query.startDate,
				endDate: query.endDate,
			},
			availableVehicles,
			unavailableVehicles,
			maintenanceVehicles,
		};
	}

	async getStats(): Promise<BookingStats> {
		return this.bookingRepo.getStats();
	}

	// Called by payment service when a payment is verified
	async onPaymentVerified(bookingId: string): Promise<void> {
		const booking = await this.bookingRepo.findById(bookingId);
		if (!booking) return;

		// Auto-confirm if booking is pending
		// Re-check status to prevent race condition
		if (booking.status === 'Pending') {
			// Re-fetch to ensure we have latest state
			const latestBooking = await this.bookingRepo.findById(bookingId);
			if (latestBooking && latestBooking.status === 'Pending') {
				await this.bookingRepo.confirm(bookingId);
			}
		}
	}

	// ---------------- Penalty management ----------------

	async getPenalties(id: string): Promise<PenaltyBreakdown> {
		const booking = await this.bookingRepo.findById(id);
		if (!booking) throw new NotFoundError('Booking');

		let lateFeeDetails: LateFeeDetails | null = null;
		const vehicle = await this.vehicleRepo.findById(booking.vehicleId);
		if (vehicle && booking.actualReturnDate) {
			const { daysLate, hoursLate } = calculateLateFee(vehicle.dailyRateIdr, booking.endDate, booking.actualReturnDate);
			if (hoursLate > 0) {
				lateFeeDetails = {
					daysLate,
					dailyRate: vehicle.dailyRateIdr,
					multiplier: LATE_FEE_MULTIPLIER,
					calculation: `${hoursLate} hour(s) late x Rp${Math.round(getHourlyRate(vehicle.dailyRateIdr))}/hour x ${LATE_FEE_MULTIPLIER} = Rp${Math.round(booking.lateFee ?? 0).toLocaleString('id-ID')}`,
				};
			}
		}

		return {
			lateFee: booking.lateFee ?? 0,
			damageFee: booking.damageFee ?? 0,
			totalPenalty: booking.totalPenalty ?? 0,
			penaltyPaid: booking.penaltyPaid ?? false,
			penaltyPaidAt: booking.penaltyPaidAt ?? null,
			lateFeeDetails,
			damageFeeDetails: null,
		};
	}

	async markPenaltyPaid(id: string): Promise<BookingResponse> {
		const booking = await this.bookingRepo.findById(id);
		if (!booking) throw new NotFoundError('Booking');
		const updated = await this.bookingRepo.update(id, {
			penaltyPaid: true,
			penaltyPaidAt: new Date().toISOString(),
		});
		if (!updated) throw new NotFoundError('Booking');
		return this.toResponse(updated);
	}

	// ---------------- Checklist / penalty helpers ----------------

	private static parseChecklistItems(raw: string): Record<string, boolean> {
		try {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed === 'object') {
				return parsed as Record<string, boolean>;
			}
		} catch {
			// ignore malformed JSON
		}
		return {};
	}

	/** Items that were OK at pickup (true) but NOT OK at return (false) = damage. */
	private static countFlippedItems(pickup: Record<string, boolean>, ret: Record<string, boolean>): number {
		let count = 0;
		for (const key of Object.keys(ret)) {
			if (pickup[key] === true && ret[key] === false) count++;
		}
		return count;
	}

	private async getDamagePerItem(): Promise<number> {
		if (!this.configRepo) return 0;
		const raw = await this.configRepo.getValue('damage_per_item');
		const n = raw ? Number(raw) : NaN;
		return Number.isFinite(n) ? n : 0;
	}

	// ── QR Scan flow ────────────────────────────────────────────────────────────

	/**
	 * Scan a vehicle QR code to determine the current context:
	 * 1. If there is a Confirmed/Active booking for this vehicle and the
	 *    current time is within 1 hour before to 1 hour after the booking
	 *    startDate -> PICKUP_CHECKLIST (serah-terima motor).
	 * 2. Otherwise -> MOTOR_CONDITION_CHECK (control / pengecekan kondisi).
	 */
	async scanQr(qrData: string, scanTimeIso: string): Promise<QrScanResult> {
		const vehicle = await this.resolveVehicleFromScan(qrData);

		const scanTime = new Date(scanTimeIso);
		const booking = await this.bookingRepo.findUpcomingConfirmedByVehicle(vehicle.id);

		const PICKUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

		let scanMode: QrScanResult['scanMode'] = 'motor_condition_check';
		let message = 'Scan untuk pengecekan kondisi motor (control).';
		let bookingSummary: QrScanResult['booking'] = null;

		if (booking) {
			const startDate = new Date(booking.startDate);
			const diffMs = scanTime.getTime() - startDate.getTime();

			if (diffMs >= -PICKUP_WINDOW_MS && diffMs <= PICKUP_WINDOW_MS) {
				scanMode = 'pickup_checklist';
				message = 'Scan untuk serah-terima motor (pickup checklist).';
			}

			// Always include booking info when a relevant booking exists
			const customer = await this.customerRepo.findById(booking.customerId);
			bookingSummary = {
				id: booking.id,
				bookingNumber: booking.bookingNumber,
				customerName: customer?.name ?? 'Unknown',
				customerPhone: customer?.phone ?? '-',
				startDate: booking.startDate,
				endDate: booking.endDate,
				status: booking.status as BookingStatus,
				paymentType: booking.paymentType ?? 'full',
			};
		}

		return {
			scanMode,
			vehicle: {
				id: vehicle.id,
				name: vehicle.name,
				plateNumber: vehicle.plateNumber,
				type: vehicle.type,
			},
			booking: bookingSummary,
			checklistItems: this.getChecklistItemsForMode(scanMode),
			message,
		};
	}

	private getChecklistItemsForMode(mode: QrScanResult['scanMode']): {
		key: string;
		label: string;
		required: boolean;
	}[] {
		if (mode === 'pickup_checklist') {
			return [
				{ key: 'fuel_level', label: 'Bensin cukup / terisi', required: true },
				{ key: 'tire_condition', label: 'Ban dalam kondisi baik (tekanan + keausan)', required: true },
				{ key: 'brake_function', label: 'Rem depan & belakang berfungsi normal', required: true },
				{ key: 'lights_function', label: 'Lampu depan, belakang, & sein menyala', required: true },
				{ key: 'horn_mirror', label: 'Klakson & spion lengkap dan berfungsi', required: true },
				{ key: 'oil_level', label: 'Oli mesin cukup', required: true },
				{ key: 'body_condition', label: 'Body motor tidak ada kerusakan baru', required: true },
				{ key: 'helmet_count', label: 'Helm disediakan sesuai jumlah (2)', required: true },
				{ key: 'raincoat', label: 'Jas hujan tersedia', required: false },
				{ key: 'phone_holder', label: 'Holder HP tersedia', required: false },
			];
		}

		// motor_condition_check
		return [
			{ key: 'engine_start', label: 'Mesin hidup normal tanpa suara aneh', required: true },
			{ key: 'brake_function', label: 'Rem depan & belakang berfungsi normal', required: true },
			{ key: 'tire_condition', label: 'Ban tidak aus / bocor', required: true },
			{ key: 'lights_function', label: 'Lampu & sein menyala', required: true },
			{ key: 'oil_level', label: 'Oli mesin dalam batas normal', required: true },
			{ key: 'chain_belt', label: 'Rantai / V-belt kencang & tidak aus', required: true },
			{ key: 'fuel_level', label: 'Bensin cukup untuk operasional', required: true },
			{ key: 'body_scratches', label: 'Tidak ada goresan / kerusakan baru', required: false },
			{ key: 'kilometer', label: 'Kilometer tercatat', required: false },
		];
	}

	/**
	 * Submit QR scan checklist results.
	 * - pickup_checklist: creates a pickup checklist record + optionally starts rental
	 * - motor_condition_check: creates a vehicle condition record (no booking needed)
	 */
	async submitChecklist(
		data: SubmitChecklistRequest,
		staffUserId: string,
	): Promise<{
		checklistId: string;
		conditionId: string;
		rentalStarted?: boolean;
	}> {
		const vehicle = await this.resolveVehicleFromScan(data.qrCode);
		const vehicleId = vehicle.id;

		// Determine overall condition status from items
		const allRequiredOk = Object.entries(data.items)
			.filter(([key]) => {
				const items = this.getChecklistItemsForMode(data.scanMode);
				return items.find((i) => i.key === key)?.required ?? false;
			})
			.every(([, value]) => value === true);

		const conditionStatus = data.conditionStatus ?? (allRequiredOk ? 'Good' : 'Fair');

		let checklistId = '';
		let rentalStarted = false;

		if (data.scanMode === 'pickup_checklist') {
			const booking = await this.bookingRepo.findUpcomingConfirmedByVehicle(vehicleId);
			if (!booking) {
				throw new NotFoundError('No Confirmed/Active booking found for this vehicle');
			}

			if (!this.checklistRepo) {
				throw new ValidationError('Checklist repository not available');
			}

			const checklist = await this.checklistRepo.create({
				bookingId: booking.id,
				vehicleId,
				type: 'pickup',
				items: JSON.stringify(data.items),
				kmReading: data.kmReading,
				fuelLevel: data.fuelLevel ?? null,
				photos: data.photos.length > 0 ? JSON.stringify(data.photos) : null,
				notes: data.notes ?? null,
				damageNotes: null,
				createdBy: staffUserId,
			});
			checklistId = checklist.id;

			// Optionally start the rental (mark Active)
			if (data.startRental && booking.status === 'Confirmed') {
				await this.bookingRepo.update(booking.id, {
					status: 'Active',
				});
				await this.vehicleRepo.update(vehicleId, { status: 'Rented' });
				rentalStarted = true;
			}
		} else {
			// motor_condition_check: no booking needed, generate a placeholder checklist ID
			checklistId = crypto.randomUUID();
		}

		// Always record a condition entry for history
		if (!this.conditionsRepo) {
			throw new ValidationError('Conditions repository not available');
		}

		await this.conditionsRepo.create({
			vehicleId,
			checklistId: checklistId || null,
			conditionStatus,
			notes: data.notes ?? null,
			km: data.kmReading,
			checkedAt: new Date().toISOString(),
			checkedBy: staffUserId,
		});

		return {
			checklistId,
			conditionId: checklistId, // re-use for simplicity; condition ID is generated inside create
			rentalStarted,
		};
	}
}
