import { PublicApiRepository } from "./public-api.repository";
import { ConfigRepository } from "@/worker/core/repositories/config.repository";
import { ValidationError } from "@/worker/core/types/errors";
import type {
  SubmitLeadRequest,
  CheckAvailabilityQuery,
  CreatePublicBookingRequest,
} from "./public-api.dto";

export class PublicApiService {
  constructor(
    private repo: PublicApiRepository,
    private configRepo: ConfigRepository,
  ) {}

  // 1. Submit Lead
  async submitLead(
    data: SubmitLeadRequest,
  ): Promise<{ id: string; status: string; createdAt: string }> {
    const source = data.source || "Website";
    const lead = await this.repo.createLead({
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      notes: data.message || null,
      source,
      status: "New",
      priority: "Warm",
      assignedTo: null,
      followUpDate: null,
    });
    return { id: lead.id, status: lead.status, createdAt: lead.createdAt };
  }

  // 2. Check Availability
  async checkAvailability(query: CheckAvailabilityQuery): Promise<{
    requestedPeriod: { startDate: string; endDate: string };
    availableVehicles: Array<{
      id: string;
      name: string;
      type: string;
      dailyRateIdr: number;
      photoUrl: string | null;
    }>;
    unavailableVehicles: Array<{ id: string; name: string; reason: string }>;
    totalAvailable: number;
  }> {
    if (query.startDate > query.endDate) {
      throw new ValidationError(
        "Start date must be before or equal to end date",
      );
    }

    const vehicles = await this.repo.getAvailableVehicles(query.type);

    // Filter by actual booking conflicts
    const availabilityChecks = await Promise.all(
      vehicles
        .filter((v) => v.status === "Available")
        .map(async (v) => ({
          vehicle: v,
          isAvailable: await this.repo.isVehicleAvailableForDates(
            v.id,
            query.startDate,
            query.endDate,
          ),
        })),
    );

    const available = availabilityChecks
      .filter(({ isAvailable }) => isAvailable)
      .map(({ vehicle: v }) => ({
        id: v.id,
        name: v.name,
        type: v.type,
        dailyRateIdr: v.dailyRateIdr,
        photoUrl: v.photoUrl,
      }));

    const unavailable = [
      ...availabilityChecks
        .filter(({ isAvailable }) => !isAvailable)
        .map(({ vehicle: v }) => ({
          id: v.id,
          name: v.name,
          reason: "Already booked",
        })),
      ...vehicles
        .filter((v) => v.status !== "Available")
        .map((v) => ({
          id: v.id,
          name: v.name,
          reason:
            v.status === "Maintenance"
              ? "Under maintenance"
              : "Currently unavailable",
        })),
    ];

    return {
      requestedPeriod: { startDate: query.startDate, endDate: query.endDate },
      availableVehicles: available,
      unavailableVehicles: unavailable,
      totalAvailable: available.length,
    };
  }

  // 3. Get Vehicle Types
  async getVehicleTypes(): Promise<{
    types: Array<{
      type: string;
      displayName: string;
      count: number;
      minDailyRate: number;
      maxDailyRate: number;
    }>;
  }> {
    const vehicles = await this.repo.getActiveVehicles();
    const typeMap = new Map<string, { count: number; rates: number[] }>();

    for (const vehicle of vehicles) {
      const existing = typeMap.get(vehicle.type) || { count: 0, rates: [] };
      existing.count++;
      existing.rates.push(vehicle.dailyRateIdr);
      typeMap.set(vehicle.type, existing);
    }

    const types = Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      displayName: this.getDisplayName(type),
      count: data.count,
      minDailyRate: Math.min(...data.rates),
      maxDailyRate: Math.max(...data.rates),
    }));

    types.sort((a, b) => a.type.localeCompare(b.type));
    return { types };
  }

  // 4. Get Vehicle Details
  async getVehicleDetails(id: string): Promise<{
    id: string;
    name: string;
    type: string;
    brand: string | null;
    model: string | null;
    year: number | null;
    dailyRate: number;
    photoUrl: string | null;
    specifications: { description: string | null };
  } | null> {
    const vehicle = await this.repo.getVehicleById(id);
    if (!vehicle) return null;

    return {
      id: vehicle.id,
      name: vehicle.name,
      type: vehicle.type,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      dailyRate: vehicle.dailyRateIdr,
      photoUrl: vehicle.photoUrl,
      specifications: { description: null },
    };
  }

  // 5. Create Booking (public — no auth required, only API key)
  async createPublicBooking(
    data: CreatePublicBookingRequest,
    midtransServerKey: string,
  ): Promise<{
    bookingId: string;
    bookingNumber: string;
    snapToken: string | null;
    snapRedirectUrl: string | null;
    totalAmount: number;
  }> {
    // Validate dates
    if (data.startDate >= data.endDate) {
      throw new ValidationError("End date must be after start date");
    }

    // Check vehicle exists and is available
    const vehicle = await this.repo.getVehicleById(data.vehicleId);
    if (!vehicle) throw new ValidationError("Vehicle not found");
    if (vehicle.status !== "Available")
      throw new ValidationError("Vehicle is not available");

    // Check date conflicts
    const isAvailable = await this.repo.isVehicleAvailableForDates(
      data.vehicleId,
      data.startDate,
      data.endDate,
    );
    if (!isAvailable)
      throw new ValidationError(
        "Vehicle is already booked for the selected dates",
      );

    // Find or create customer
    let customer = await this.repo.findCustomerByPhone(data.customerPhone);
    if (!customer) {
      customer = await this.repo.createCustomer({
        name: data.customerName,
        phone: data.customerPhone,
        email: data.customerEmail || null,
        notes: data.notes || null,
        isBlacklisted: false,
      });
    }

    // Calculate amount
    const days = Math.ceil(
      (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const totalAmount = days * vehicle.dailyRateIdr;

    // Create booking
    const booking = await this.repo.createBooking({
      customerId: customer.id,
      vehicleId: data.vehicleId,
      startDate: data.startDate,
      endDate: data.endDate,
      status: "Pending",
      paymentTerms: "Full_Upfront",
      baseAmount: totalAmount,
      addonsAmount: 0,
      lateFee: 0,
      totalAmount,
      currency: "IDR",
      notes: data.notes || null,
      createdBy: null,
    });

    // Request Midtrans Snap token
    let snapToken: string | null = null;
    let snapRedirectUrl: string | null = null;

    if (midtransServerKey) {
      try {
        const midtransEnv = "sandbox";
        const midtransBaseUrl =
          midtransEnv === "sandbox"
            ? "https://app.sandbox.midtrans.com/snap/v1/transactions"
            : "https://app.midtrans.com/snap/v1/transactions";

        const midtransResponse = await fetch(midtransBaseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(midtransServerKey + ":")}`,
          },
          body: JSON.stringify({
            transaction_details: {
              order_id: booking.bookingNumber,
              gross_amount: totalAmount,
            },
            customer_details: {
              first_name: customer.name,
              phone: customer.phone,
              email: customer.email || undefined,
            },
            item_details: [
              {
                id: vehicle.id,
                price: vehicle.dailyRateIdr,
                quantity: days,
                name: `${vehicle.name} (${days} day${days > 1 ? "s" : ""})`,
              },
            ],
          }),
        });

        if (midtransResponse.ok) {
          const midtransData = (await midtransResponse.json()) as {
            token: string;
            redirect_url: string;
          };
          snapToken = midtransData.token;
          snapRedirectUrl = midtransData.redirect_url;
        }
      } catch (error) {
        console.error("Midtrans error:", error);
      }
    }

    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      snapToken,
      snapRedirectUrl,
      totalAmount,
    };
  }

  async isPublicApiEnabled(): Promise<boolean> {
    return this.configRepo.getBoolean("public_api_enabled", false);
  }

  private getDisplayName(type: string): string {
    const displayNames: Record<string, string> = {
      TrailBike: "Trail Bike",
      StreetBike: "Street Bike",
      Car: "Car",
      Jeep: "Jeep",
      Other: "Other",
    };
    return displayNames[type] || type;
  }
}
