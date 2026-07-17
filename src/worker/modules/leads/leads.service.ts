import { LeadsRepository } from "./leads.repository";
import { BookingsRepository } from "../bookings/bookings.repository";
import { VehiclesRepository } from "../vehicles/vehicles.repository";
import { CustomersRepository } from "../customers/customers.repository";
import { NotFoundError, ValidationError, ConflictError } from "@/worker/core/types/errors";
import {
  generateBookingNumber,
  calculateDays,
} from "../bookings/availability.helper";
import type {
  LeadResponse,
  LeadWithDetails,
  LeadStats,
  LeadSource,
} from "./leads.types";
import type {
  CreateLeadRequest,
  UpdateLeadRequest,
  UpdateLeadStatusRequest,
  AddNoteRequest,
  ListLeadsQuery,
  ConvertToBookingRequest,
} from "./leads.dto";
import type { Lead } from "@/worker/core/database/schema";

export class LeadsService {
  constructor(
    private leadRepo: LeadsRepository,
    private bookingRepo?: BookingsRepository,
    private vehicleRepo?: VehiclesRepository,
    private customerRepo?: CustomersRepository,
  ) {}

  // Transform lead to response format
  private toResponse(lead: Lead): LeadResponse {
    return {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      notes: lead.notes,
      source: lead.source,
      status: lead.status,
      priority: lead.priority,
      assignedTo: lead.assignedTo,
      followUpDate: lead.followUpDate,
      convertedAt: lead.convertedAt,
      createdAt: lead.createdAt,
    };
  }

  async list(query: ListLeadsQuery): Promise<{
    items: LeadWithDetails[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { items, total } = await this.leadRepo.list(query);
    const totalPages = Math.ceil(total / query.limit);

    const itemsWithDetails: LeadWithDetails[] = items.map((lead) => ({
      ...this.toResponse(lead),
      assignedToUser: lead.assignedTo
        ? { id: lead.assignedTo, name: "Unknown" }
        : null,
      convertedBooking: null,
    }));

    return {
      items: itemsWithDetails,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async getById(id: string): Promise<LeadWithDetails | null> {
    const lead = await this.leadRepo.findById(id);
    if (!lead) {
      return null;
    }

    return {
      ...this.toResponse(lead),
      assignedToUser: lead.assignedTo
        ? { id: lead.assignedTo, name: "Unknown" }
        : null,
      convertedBooking: null,
    };
  }

  async create(data: CreateLeadRequest): Promise<LeadResponse> {
    // Check if phone already exists
    const existingByPhone = await this.leadRepo.findByPhone(data.phone);
    if (existingByPhone) {
      throw new ConflictError("Nomor telepon sudah terdaftar");
    }

    const lead = await this.leadRepo.create({
      name: data.name,
      phone: data.phone,
      email: data.email ?? null,
      notes: data.notes ?? null,
      source: data.source,
      status: "New",
      priority: data.priority,
      assignedTo: data.assignedTo ?? null,
      followUpDate: data.followUpDate ?? null,
    });

    return this.toResponse(lead);
  }

  async update(id: string, data: UpdateLeadRequest): Promise<LeadResponse> {
    const existing = await this.leadRepo.findById(id);
    if (!existing) {
      throw new NotFoundError("Lead");
    }

    if (existing.status === "Converted") {
      throw new ValidationError("Cannot update converted leads");
    }

    // Check phone uniqueness if changing phone
    if (data.phone && data.phone !== existing.phone) {
      const existingByPhone = await this.leadRepo.findByPhone(data.phone);
      if (existingByPhone) {
        throw new ConflictError("Nomor telepon sudah terdaftar");
      }
    }

    const lead = await this.leadRepo.update(id, {
      name: data.name,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
      priority: data.priority,
      assignedTo: data.assignedTo,
      followUpDate: data.followUpDate,
    });

    if (!lead) {
      throw new NotFoundError("Lead");
    }

    return this.toResponse(lead);
  }

  async updateStatus(
    id: string,
    data: UpdateLeadStatusRequest,
  ): Promise<LeadResponse> {
    const existing = await this.leadRepo.findById(id);
    if (!existing) {
      throw new NotFoundError("Lead");
    }

    if (existing.status === "Converted" && data.status !== "Converted") {
      throw new ValidationError("Cannot change status of converted leads");
    }

    let lead = await this.leadRepo.updateStatus(id, data.status);

    if (data.notes && lead) {
      lead = await this.leadRepo.appendNote(id, data.notes, lead.notes);
    }

    if (!lead) {
      throw new NotFoundError("Lead");
    }

    return this.toResponse(lead);
  }

  async addNote(id: string, data: AddNoteRequest): Promise<LeadResponse> {
    const existing = await this.leadRepo.findById(id);
    if (!existing) {
      throw new NotFoundError("Lead");
    }

    const lead = await this.leadRepo.appendNote(id, data.note, existing.notes);

    if (!lead) {
      throw new NotFoundError("Lead");
    }

    return this.toResponse(lead);
  }

  async assignToUser(id: string, userId: string | null): Promise<LeadResponse> {
    const existing = await this.leadRepo.findById(id);
    if (!existing) {
      throw new NotFoundError("Lead");
    }

    const lead = await this.leadRepo.update(id, { assignedTo: userId });

    if (!lead) {
      throw new NotFoundError("Lead");
    }

    return this.toResponse(lead);
  }

  async convertToBooking(
    leadId: string,
    data: ConvertToBookingRequest,
    userId: string,
  ): Promise<{
    lead: LeadResponse;
    booking: {
      id: string;
      bookingNumber: string;
      status: string;
      totalAmount: number;
    };
  }> {
    if (!this.bookingRepo || !this.vehicleRepo || !this.customerRepo) {
      throw new ValidationError("Booking service not available");
    }

    // Get lead
    const lead = await this.leadRepo.findById(leadId);
    if (!lead) {
      throw new NotFoundError("Lead");
    }

    // Check if already converted
    if (lead.status === "Converted") {
      throw new ValidationError("Lead is already converted");
    }

    // Find or create customer from lead
    // Try to find existing customer by phone
    let customer = await this.customerRepo.findByPhone(lead.phone);

    if (!customer) {
      // Create new customer from lead data
      customer = await this.customerRepo.create({
        name: lead.name,
        phone: lead.phone,
        email: lead.email ?? null,
        address: null,
        notes: `Converted from lead`,
        isBlacklisted: false,
        blacklistReason: null,
      });
    }

    // Validate vehicle
    const vehicle = await this.vehicleRepo.findById(data.vehicleId);
    if (!vehicle) {
      throw new NotFoundError("Vehicle");
    }

    if (vehicle.status === "Maintenance") {
      throw new ValidationError("Vehicle is currently under maintenance");
    }

    if (vehicle.status === "Inactive") {
      throw new ValidationError("Vehicle is inactive");
    }

    // Check availability
    const conflicts = await this.bookingRepo.findConflictingBookings(
      data.vehicleId,
      data.startDate,
      data.endDate,
    );

    if (conflicts.length > 0) {
      throw new ValidationError(
        `Vehicle is not available for the selected dates. Conflicting booking: ${conflicts[0].bookingNumber}`,
      );
    }

    // Calculate amounts
    const days = calculateDays(data.startDate, data.endDate);
    const baseAmount = vehicle.dailyRateIdr * days;
    const bookingNumber = generateBookingNumber();

    // Create booking
    const booking = await this.bookingRepo.create({
      bookingNumber,
      customerId: customer.id,
      vehicleId: data.vehicleId,
      startDate: data.startDate,
      endDate: data.endDate,
      status: "Pending",
      paymentTerms: data.paymentTerms,
      baseAmount,
      addonsAmount: 0,
      lateFee: 0,
      totalAmount: baseAmount,
      currency: "IDR",
      notes: data.notes ?? null,
      createdBy: userId,
    });

    // Mark lead as converted
    const updatedLead = await this.leadRepo.updateStatus(leadId, "Converted");
    await this.leadRepo.update(leadId, {
      convertedAt: new Date().toISOString(),
    });

    return {
      lead: this.toResponse(updatedLead ?? lead),
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        totalAmount: booking.totalAmount,
      },
    };
  }

  async getStats(): Promise<LeadStats> {
    const stats = await this.leadRepo.getStats();

    const convertedCount = stats.byStatus["Converted"] || 0;
    const conversionRate =
      stats.total > 0 ? Math.round((convertedCount / stats.total) * 100) : 0;

    const bySource = Object.entries(stats.bySource).map(([source, data]) => ({
      source: source as LeadSource,
      count: data.count,
      converted: data.converted,
    }));

    return {
      total: stats.total,
      byStatus: stats.byStatus as LeadStats["byStatus"],
      bySource,
      byPriority: stats.byPriority as LeadStats["byPriority"],
      conversionRate,
      followUpsDue: stats.followUpsDue,
    };
  }

  async checkExists(id: string): Promise<boolean> {
    const lead = await this.leadRepo.findById(id);
    return lead !== null;
  }
}
