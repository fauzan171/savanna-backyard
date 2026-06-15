import { PublicApiRepository } from "./public-api.repository";
import { ConfigRepository } from "@/worker/core/repositories/config.repository";
import { ValidationError } from "@/worker/core/types/errors";
import type {
  SubmitLeadRequest,
  CheckAvailabilityQuery,
  CreatePublicBookingRequest,
} from "./public-api.dto";

/**
 * Safely parse a JSON string column that may contain plain text.
 * Returns the fallback if parsing fails.
 */
function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Safely parse a JSON string column into a string array. */
function safeJsonParseStringArray(value: string | null | undefined): string[] {
  const parsed = safeJsonParse<unknown>(value, []);
  return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
}

/**
 * Resolve a stored URL into an absolute URL consumable by external clients.
 *
 * Stored values may be relative paths (e.g. `/api/v1/uploads/...`) or already
 * absolute URLs. For the public API, relative paths must be prefixed with the
 * API origin so cross-origin clients (landing page) can load the assets.
 */
function resolveUrl(value: string | null | undefined, baseUrl: string): string | null {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  // Relative path -> prefix with API origin
  return `${baseUrl}${value.startsWith('/') ? '' : '/'}${value}`;
}

export class PublicApiService {
  /** Base URL of the API origin, e.g. "https://api.example.com". Used to resolve relative upload paths. */
  private readonly baseUrl: string;

  constructor(
    private repo: PublicApiRepository,
    private configRepo: ConfigRepository,
    baseUrl = '',
  ) {
    // Strip trailing slash so resolveUrl can always prepend cleanly
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

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
      preferredStart: data.preferredDates?.start || null,
      preferredEnd: data.preferredDates?.end || null,
      vehicleInterest: data.preferredDates?.vehicleInterest || null,
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
        photoUrl: resolveUrl(v.photoUrl, this.baseUrl),
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
      photoUrl: resolveUrl(vehicle.photoUrl, this.baseUrl),
      specifications: { description: null },
    };
  }

  // 5. Create Booking (public — no auth required, only API key)
  async createPublicBooking(
    data: CreatePublicBookingRequest,
    ifortepayConfig: {
      merchantId: string;
      secretUnboundId: string;
      hashKey: string;
      isProduction: boolean;
      callbackUrl: string;
      successRedirectUrl: string;
      failedRedirectUrl: string;
    },
  ): Promise<{
    bookingId: string;
    bookingNumber: string;
    paymentPageUrl: string | null;
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
        notes: (data.notes && data.notes.trim()) || null,
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
      status: "pending_payment",
      paymentTerms: "Full_Upfront",
      paymentStatus: "pending",
      paymentMethod: "online",
      baseAmount: totalAmount,
      addonsAmount: 0,
      lateFee: 0,
      totalAmount,
      currency: "IDR",
      notes: data.notes || null,
      createdBy: null,
    });

    // Request iFortePay Payment Page
    let paymentPageUrl: string | null = null;

    if (ifortepayConfig.merchantId && ifortepayConfig.secretUnboundId) {
      try {
        const baseUrl = ifortepayConfig.isProduction
          ? "https://api.ifortepay.id"
          : "https://api-stage.ifortepay.id";

        const externalId = `ext-${booking.id}`;
        const signatureRaw = `${ifortepayConfig.hashKey}${externalId}${booking.bookingNumber}`;
        const signatureEncoded = new TextEncoder().encode(signatureRaw);
        const signatureBuffer = await crypto.subtle.digest("SHA-256", signatureEncoded);
        const signature = Array.from(new Uint8Array(signatureBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        const authHeader = `Basic ${btoa(`${ifortepayConfig.merchantId}:${ifortepayConfig.secretUnboundId}`)}`;

        const requestBody = {
          order_id: booking.bookingNumber,
          external_id: externalId,
          amount: totalAmount,
          description: `Rental ${vehicle.name} (${days} day${days > 1 ? "s" : ""})`,
          customer_details: {
            full_name: customer.name,
            email: customer.email ?? "",
            phone: customer.phone,
          },
          item_details: [
            {
              item_id: vehicle.id,
              name: `${vehicle.name} (${days} day${days > 1 ? "s" : ""})`,
              amount: vehicle.dailyRateIdr,
              qty: days,
            },
          ],
          callback_url: ifortepayConfig.callbackUrl,
          success_redirect_url: ifortepayConfig.successRedirectUrl,
          failed_redirect_url: ifortepayConfig.failedRedirectUrl,
        };

        const ifortepayResponse = await fetch(`${baseUrl}/payment-page/payment`, {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
            "x-req-signature": signature,
            "x-version": "v3",
          },
          body: JSON.stringify(requestBody),
        });

        if (ifortepayResponse.ok) {
          const ifortepayData = (await ifortepayResponse.json()) as Record<string, unknown>;
          paymentPageUrl = (ifortepayData.payment_page_url as string)
            ?? (ifortepayData.paymentPageUrl as string)
            ?? (ifortepayData.url as string)
            ?? null;

          // Save payment page URL to booking
          if (paymentPageUrl) {
            await this.repo.updateBooking(booking.id, {
              paymentPageUrl,
            });
          }
        } else {
          const errorText = await ifortepayResponse.text();
          console.error("iFortePay error:", ifortepayResponse.status, errorText);
        }
      } catch (error) {
        console.error("iFortePay exception:", error);
      }
    }

    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      paymentPageUrl,
      totalAmount,
    };
  }

  async isPublicApiEnabled(): Promise<boolean> {
    return this.configRepo.getBoolean("public_api_enabled", false);
  }

  // ===== FASE 2 METHODS =====

  // 6. Get public vehicles
  async getPublicVehicles(): Promise<Array<{
    id: string; name: string; type: string; category: string | null;
    image: string | null; dailyRateIdr: number; specs: Record<string, string> | null;
    description: string | null; available: boolean;
  }>> {
    const vehicles = await this.repo.getPublicVehicles();
    return vehicles.map((v) => {
      const parsedSpecs = safeJsonParse<Record<string, string> | null>(
        typeof v.specs === "string" ? v.specs : null,
        v.specs ? { details: String(v.specs) } : null,
      );
      return {
        id: v.id,
        name: v.name,
        type: v.type,
        category: v.category,
        image: resolveUrl(v.photoUrl, this.baseUrl),
        dailyRateIdr: v.dailyRateIdr,
        specs: parsedSpecs,
        description: v.description,
        available: v.status === "Available",
      };
    });
  }

  // 7. Get public packages
  async getPublicPackages(): Promise<Array<{
    id: string; name: string; tagline: string | null;
    description: string | null; image: string | null;
    duration: string | null; distance: string | null;
    groupSize: string | null; price: number; trailId: string | null;
  }>> {
    const pkgs = await this.repo.getActivePackages();
    return pkgs.map(p => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      image: resolveUrl(p.image, this.baseUrl),
      duration: p.duration,
      distance: p.distance,
      groupSize: p.groupSize,
      price: p.price,
      trailId: p.trailId,
    }));
  }

  // 8. Get public pricing
  async getPublicPricing(): Promise<Array<{
    id: string; name: string; description: string | null;
    dailyPrice: number; multiDayPrice: number;
    features: string[]; notIncluded: string[];
    highlighted: boolean; icon: string | null;
  }>> {
    const tiers = await this.repo.getActivePricingTiers();
    return tiers.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      dailyPrice: t.dailyPrice,
      multiDayPrice: t.multiDayPrice,
      features: safeJsonParseStringArray(t.features),
      notIncluded: safeJsonParseStringArray(t.notIncluded),
      highlighted: t.highlighted,
      icon: t.icon,
    }));
  }

  // 9. Get public reviews
  async getPublicReviews(query: { limit?: number; offset?: number; rating?: number }): Promise<{
    data: Array<{
      id: string; name: string; location: string | null;
      rating: number; text: string; avatar: string | null; createdAt: string;
    }>;
    meta: { total: number; averageRating: number };
  }> {
    const limit = query.limit ?? 10;
    const offset = query.offset ?? 0;
    const result = await this.repo.getPublishedReviews(limit, offset, query.rating);

    return {
      data: result.reviews.map(r => ({
        id: r.id,
        name: r.name,
        location: r.location,
        rating: r.rating,
        text: r.text,
        avatar: resolveUrl(r.avatar, this.baseUrl),
        createdAt: r.createdAt,
      })),
      meta: { total: result.total, averageRating: result.averageRating },
    };
  }

  // 10. Get public trails (list)
  async getPublicTrails(): Promise<Array<{
    id: string; name: string; desc: string | null;
    terrain: string | null; elevation: string | null;
    difficulty: string | null; recommended: string | null;
    image: string | null; mapImage: string | null;
  }>> {
    const trailList = await this.repo.getActiveTrails();
    return trailList.map(t => ({
      id: t.id,
      name: t.name,
      desc: t.description,
      terrain: t.terrain,
      elevation: t.elevation,
      difficulty: t.difficulty,
      recommended: t.recommended,
      image: resolveUrl(t.image, this.baseUrl),
      mapImage: resolveUrl(t.mapImage, this.baseUrl),
    }));
  }

  // 10b. Get single trail (with blog content)
  async getPublicTrailById(trailId: string): Promise<{
    id: string; name: string; desc: string | null;
    terrain: string | null; elevation: string | null;
    difficulty: string | null; recommended: string | null;
    image: string | null; mapImage: string | null;
    blogContent: {
      overview: string | null; tips: string | null;
      gallery: string[]; gpxUrl: string | null;
      estimatedDuration: string | null; distance: string | null;
      bestTime: string | null;
    };
  } | null> {
    const trail = await this.repo.getTrailById(trailId);
    if (!trail) return null;

    return {
      id: trail.id,
      name: trail.name,
      desc: trail.description,
      terrain: trail.terrain,
      elevation: trail.elevation,
      difficulty: trail.difficulty,
      recommended: trail.recommended,
      image: resolveUrl(trail.image, this.baseUrl),
      mapImage: resolveUrl(trail.mapImage, this.baseUrl),
      blogContent: {
        overview: trail.blogOverview,
        tips: trail.blogTips,
        gallery: safeJsonParse<string[]>(trail.blogGallery, []).map((g) => resolveUrl(g, this.baseUrl)).filter((g): g is string => g !== null),
        gpxUrl: resolveUrl(trail.gpxUrl, this.baseUrl),
        estimatedDuration: trail.estimatedDuration,
        distance: trail.distance,
        bestTime: trail.bestTime,
      },
    };
  }

  // 11. Get public settings
  async getPublicSettings(): Promise<{
    contactEmail: string; contactPhone: string;
    whatsappNumber: string; location: string;
    instagramUrl: string;
    bankAccount: { bankName: string; accountNumber: string; accountHolder: string };
    deposit: { amount: number; description: string };
  }> {
    const getValue = async (key: string, fallback: string = ''): Promise<string> => {
      const val = await this.configRepo.getValue(key);
      return val ?? fallback;
    };

    return {
      contactEmail: await getValue('contact_email'),
      contactPhone: await getValue('contact_phone'),
      whatsappNumber: await getValue('whatsapp_number'),
      location: await getValue('location'),
      instagramUrl: await getValue('instagram_url'),
      bankAccount: {
        bankName: await getValue('bank_name'),
        accountNumber: await getValue('bank_account_number'),
        accountHolder: await getValue('bank_account_holder'),
      },
      deposit: {
        amount: await this.configRepo.getNumber('deposit_amount', 0),
        description: await getValue('deposit_description'),
      },
    };
  }

  // 12. Get booking status by number
  async getBookingStatus(bookingNumber: string): Promise<{
    bookingNumber: string; status: string; paymentStatus: string | null;
    vehicleName: string; startDate: string; endDate: string;
    totalAmount: number; paidAt: string | null;
  } | null> {
    const booking = await this.repo.findBookingByNumber(bookingNumber);
    if (!booking) return null;

    const vehicle = await this.repo.getVehicleById(booking.vehicleId);

    return {
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      vehicleName: vehicle?.name ?? 'Unknown',
      startDate: booking.startDate,
      endDate: booking.endDate,
      totalAmount: booking.totalAmount,
      paidAt: booking.paidAt,
    };
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
