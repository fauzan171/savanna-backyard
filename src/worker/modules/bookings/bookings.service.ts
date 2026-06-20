import { BookingsRepository } from './bookings.repository';
import { VehiclesRepository } from '../vehicles/vehicles.repository';
import { CustomersRepository } from '../customers/customers.repository';
import { ChecklistsRepository } from '../checklists/checklists.repository';
import { ConflictError, NotFoundError, ValidationError, ForbiddenError } from '@/worker/core/types/errors';
import {
	generateBookingNumber,
	calculateDays,
	calculateLateFee,
	LATE_FEE_MULTIPLIER,
} from './availability.helper';
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
} from './bookings.dto';
import type { Booking, Vehicle } from '@/worker/core/database/schema';

export class BookingsService {
	constructor(
		private bookingRepo: BookingsRepository,
		private vehicleRepo: VehiclesRepository,
		private customerRepo: CustomersRepository,
		private checklistRepo?: ChecklistsRepository
	) {}

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
			totalAmount: booking.totalAmount,
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

		// Calculate amounts with validation for daily rate
		const days = calculateDays(data.startDate, data.endDate);
		const dailyRate = data.currency === 'USD' ? (vehicle.dailyRateUsd ?? 0) : vehicle.dailyRateIdr;

		// Validate daily rate exists
		if (dailyRate === 0) {
			throw new ValidationError(
				`Vehicle does not have a ${data.currency} daily rate configured`
			);
		}

		const baseAmount = dailyRate * days;

		// Calculate addons amount
		let addonsAmount = 0;
		for (const addon of data.addons ?? []) {
			addonsAmount += addon.amount;
		}

		const totalAmount = baseAmount + addonsAmount;

		// Generate booking number
		const bookingNumber = generateBookingNumber();

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

		const updated = await this.bookingRepo.update(id, {
			notes: data.notes,
		});

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

		return this.toResponse(updated);
	}

	async startRental(id: string, data: StartRentalRequest): Promise<BookingResponse> {
		const booking = await this.bookingRepo.findById(id);
		if (!booking) {
			throw new NotFoundError('Booking');
		}

		// Validate pickup checklist exists
		if (this.checklistRepo) {
			const pickupChecklist = await this.checklistRepo.findByBookingAndType(booking.id, 'pickup');
			if (!pickupChecklist) {
				throw new ValidationError('Checklist pickup wajib diisi sebelum memulai rental');
			}
		}

		this.validateStatusTransition(booking.status, 'Active');

		// Validate start km
		if (data.startKm < 0) {
			throw new ValidationError('Start KM must be a non-negative number');
		}

		// Update booking with start km
		const updated = await this.bookingRepo.startRental(id, data.startKm);
		if (!updated) {
			throw new NotFoundError('Booking');
		}

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

		// Validate return checklist exists
		if (this.checklistRepo) {
			const returnChecklist = await this.checklistRepo.findByBookingAndType(booking.id, 'return');
			if (!returnChecklist) {
				throw new ValidationError('Checklist return wajib diisi sebelum menyelesaikan rental');
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

		// Calculate late fee - add to existing total, not recalculate
		const { daysLate, lateFee } = calculateLateFee(
			vehicle.dailyRateIdr,
			booking.endDate,
			data.actualReturnDate
		);

		// Calculate new total by adding late fee to current total
		const newTotalAmount = booking.totalAmount + lateFee;

		// Update booking
		const updated = await this.bookingRepo.completeRental(id, {
			actualReturnDate: data.actualReturnDate,
			endKm: data.endKm,
			lateFee,
			totalAmount: newTotalAmount,
		});

		if (!updated) {
			throw new NotFoundError('Booking');
		}

		// Update vehicle status back to Available and update km
		await this.vehicleRepo.update(booking.vehicleId, {
			status: 'Available',
			totalKm: data.endKm,
		});

		const response = await this.toResponse(updated);

		let lateFeeDetails: LateFeeDetails | null = null;
		if (daysLate > 0) {
			lateFeeDetails = {
				daysLate,
				dailyRate: vehicle.dailyRateIdr,
				multiplier: LATE_FEE_MULTIPLIER,
				calculation: `${daysLate} day(s) x ${vehicle.dailyRateIdr} x ${LATE_FEE_MULTIPLIER} = ${lateFee}`,
			};
		}

		return {
			...response,
			lateFeeDetails,
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

		// Calculate additional amount
		const vehicle = await this.vehicleRepo.findById(booking.vehicleId);
		if (!vehicle) {
			throw new NotFoundError('Vehicle');
		}

		const additionalDays = calculateDays(booking.endDate, data.newEndDate);
		const additionalAmount = vehicle.dailyRateIdr * additionalDays;
		const newTotalAmount = booking.totalAmount + additionalAmount;

		// Update booking
		const originalEndDate = booking.endDate;
		await this.bookingRepo.extend(id, data.newEndDate, newTotalAmount);

		return {
			id,
			originalEndDate,
			newEndDate: data.newEndDate,
			additionalDays,
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

		// Update booking with cancellation reason in notes
		const updated = await this.bookingRepo.update(id, {
			status: 'Cancelled',
			cancelledAt: new Date().toISOString(),
			notes: booking.notes ? `${booking.notes}\n\nCancellation reason: ${reason}` : `Cancellation reason: ${reason}`,
		});

		if (!updated) {
			throw new NotFoundError('Booking');
		}

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

		// Update totals
		const newAddonsAmount = (booking.addonsAmount ?? 0) + data.amount;
		const newTotalAmount = booking.baseAmount + newAddonsAmount + (booking.lateFee ?? 0);
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

		// Update totals
		const newAddonsAmount = (booking.addonsAmount ?? 0) - addon.amount;
		const newTotalAmount = booking.baseAmount + newAddonsAmount + (booking.lateFee ?? 0);
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
}
