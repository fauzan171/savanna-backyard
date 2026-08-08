import { ChecklistsRepository } from './checklists.repository';
import { BookingsRepository } from '../bookings/bookings.repository';
import { NotFoundError, ValidationError, ConflictError } from '@/worker/core/types/errors';
import type { ChecklistResponse, ChecklistsByBooking, ChecklistItems } from './checklists.types';
import type { CreateChecklistRequest, UpdateChecklistRequest } from './checklists.dto';
import type { VehicleChecklist } from '@/worker/core/database/schema';

export class ChecklistsService {
	constructor(
		private checklistRepo: ChecklistsRepository,
		private bookingRepo: BookingsRepository
	) {}

	private toResponse(checklist: VehicleChecklist): ChecklistResponse {
		return {
			id: checklist.id,
			bookingId: checklist.bookingId,
			vehicleId: checklist.vehicleId,
			type: checklist.type,
			submissionSource: checklist.submissionSource,
			items: JSON.parse(checklist.items) as ChecklistItems,
			kmReading: checklist.kmReading,
			fuelLevel: checklist.fuelLevel,
			photos: checklist.photos ? JSON.parse(checklist.photos) as string[] : [],
			notes: checklist.notes,
			damageNotes: checklist.damageNotes,
			createdBy: checklist.createdBy,
			createdByPublicUserId: checklist.createdByPublicUserId,
			createdAt: checklist.createdAt,
			updatedAt: checklist.updatedAt,
		};
	}

	async create(userId: string, data: CreateChecklistRequest): Promise<ChecklistResponse> {
		// Validate booking exists
		const booking = await this.bookingRepo.findById(data.bookingId);
		if (!booking) {
			throw new NotFoundError('Booking');
		}

		// Validate no duplicate checklist type for this booking
		const existing = await this.checklistRepo.findByBookingAndType(data.bookingId, data.type);
		if (existing) {
			throw new ConflictError(`Checklist ${data.type} sudah ada untuk booking ini`);
		}

		// For return checklist, validate kmReading > pickup kmReading
		if (data.type === 'return') {
			const pickupChecklist = await this.checklistRepo.findByBookingAndType(data.bookingId, 'pickup');
			if (pickupChecklist && data.kmReading <= pickupChecklist.kmReading) {
				throw new ValidationError(`KM return (${data.kmReading}) harus lebih besar dari KM pickup (${pickupChecklist.kmReading})`);
			}

			// Validate damage notes if any item changed from true to false
			if (pickupChecklist) {
				const pickupItems = JSON.parse(pickupChecklist.items) as ChecklistItems;
				const hasDamage = Object.entries(data.items).some(
					([key, value]) => pickupItems[key] === true && value === false
				);
				if (hasDamage && !data.damageNotes) {
					throw new ValidationError('Ada item yang berubah dari OK ke tidak OK. Wajib isi catatan kerusakan (damageNotes)');
				}
			}
		}

		const now = new Date().toISOString();
		const checklist = await this.checklistRepo.create({
			bookingId: data.bookingId,
			vehicleId: booking.vehicleId,
			type: data.type,
			submissionSource: 'admin',
			items: JSON.stringify(data.items),
			kmReading: data.kmReading,
			fuelLevel: data.fuelLevel ?? null,
			photos: data.photos ? JSON.stringify(data.photos) : null,
			notes: data.notes ?? null,
			damageNotes: data.damageNotes ?? null,
			createdBy: userId,
			createdByPublicUserId: null,
			createdAt: now,
			updatedAt: now,
		});

		return this.toResponse(checklist);
	}

	async getByBookingId(bookingId: string): Promise<ChecklistsByBooking> {
		const result = await this.checklistRepo.findByBookingId(bookingId);
		return {
			// Legacy aliases kept for the current UI; they point to the admin/final checklist.
			pickup: result.adminPickup ? this.toResponse(result.adminPickup) : null,
			return: result.adminReturn ? this.toResponse(result.adminReturn) : null,
			customerPickup: result.customerPickup ? this.toResponse(result.customerPickup) : null,
			adminPickup: result.adminPickup ? this.toResponse(result.adminPickup) : null,
			customerReturn: result.customerReturn ? this.toResponse(result.customerReturn) : null,
			adminReturn: result.adminReturn ? this.toResponse(result.adminReturn) : null,
		};
	}

	async getById(id: string): Promise<ChecklistResponse> {
		const checklist = await this.checklistRepo.findById(id);
		if (!checklist) {
			throw new NotFoundError('Checklist');
		}
		return this.toResponse(checklist);
	}

	async update(id: string, data: UpdateChecklistRequest): Promise<ChecklistResponse> {
		const checklist = await this.checklistRepo.findById(id);
		if (!checklist) {
			throw new NotFoundError('Checklist');
		}

		const updateData: Partial<{
			items: string;
			kmReading: number;
			fuelLevel: number | null;
			photos: string | null;
			notes: string | null;
			damageNotes: string | null;
		}> = {};

		if (data.items !== undefined) {
			updateData.items = JSON.stringify(data.items);
		}
		if (data.kmReading !== undefined) {
			updateData.kmReading = data.kmReading;
		}
		if (data.fuelLevel !== undefined) {
			updateData.fuelLevel = data.fuelLevel;
		}
		if (data.photos !== undefined) {
			updateData.photos = data.photos ? JSON.stringify(data.photos) : null;
		}
		if (data.notes !== undefined) {
			updateData.notes = data.notes;
		}
		if (data.damageNotes !== undefined) {
			updateData.damageNotes = data.damageNotes;
		}

		const updated = await this.checklistRepo.update(id, updateData);
		return this.toResponse(updated);
	}
}
