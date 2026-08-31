import { PublicApiRepository } from "./public-api.repository";
import { ConfigRepository } from "@/worker/core/repositories/config.repository";
import { ValidationError, ConflictError, ForbiddenError } from "@/worker/core/types/errors";
import { PaymentGatewayFactory } from "@/worker/core/services/payment-gateway/factory";
import { calculateTwelveHourBlocks } from '@/worker/modules/bookings/availability.helper';
import type { GatewayVendor } from "@/worker/core/services/payment-gateway/types";
import type {
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
 * Parse a date string (YYYY-MM-DD or ISO 8601) into a UTC Date.
 * For calendar display: if time > 00:00, round up to next day so the calendar
 * conservatively marks partial days as booked (prevents UI/backend mismatch).
 */
function parseDateStr(value: string, roundUp = false): Date {
  if (!value.includes('T')) {
    // Pure date string
    const [y, m, d] = value.split('-').map(Number);
    return new Date(Date.UTC(y!, m! - 1, d!));
  }
  // ISO 8601 datetime
  const datePart = value.split('T')[0]!;
  const [y, m, d] = datePart.split('-').map(Number);
  if (!roundUp) {
    return new Date(Date.UTC(y!, m! - 1, d!));
  }
  // Check if time > 00:00
  const timePart = value.split('T')[1] || '';
  const hourMin = timePart.split(':')[0] || '0';
  const hour = parseInt(hourMin, 10);
  if (hour > 0) {
    // Round up to next day
    return new Date(Date.UTC(y!, m! - 1, d! + 1));
  }
  return new Date(Date.UTC(y!, m! - 1, d!));
}

/** Format a UTC Date back to a 'YYYY-MM-DD' string (timezone-safe). */
function formatDateStr(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
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

function hasMeaningfulText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeForChecks(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function looksLikeSeedOrQaData(value: string | null | undefined): boolean {
  const normalized = normalizeForChecks(value);
  if (!normalized) return false;

  return (
    /(^|[\s\-_[(])(qa|test|dummy|sample|seed|staging|dev)([\s\-_)\]]|$)/i.test(normalized) ||
    normalized.startsWith('qa') ||
    normalized.startsWith('test') ||
    normalized.includes('dummy') ||
    normalized.includes('sample')
  );
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

  // 1. Check Availability
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

    const vehicles = (await this.repo.getAvailableVehicles(query.type)).filter((vehicle) =>
      this.isPublicVehiclePublishable(vehicle),
    );

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
    const vehicles = (await this.repo.getActiveVehicles()).filter((vehicle) =>
      this.isPublicVehiclePublishable(vehicle),
    );
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
    category: string | null;
    dailyRateIdr: number;
    image: string | null;
    specs: Record<string, string> | null;
    description: string | null;
    available: boolean;
  } | null> {
    const vehicle = await this.repo.getVehicleById(id);
    if (!vehicle) return null;
    if (!this.isPublicVehiclePublishable(vehicle)) return null;

    const parsedSpecs = safeJsonParse<Record<string, string> | null>(
      typeof vehicle.specs === "string" ? vehicle.specs : null,
      vehicle.specs ? { details: String(vehicle.specs) } : null,
    );

    return {
      id: vehicle.id,
      name: vehicle.name,
      type: vehicle.type,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      category: vehicle.category,
      dailyRateIdr: vehicle.dailyRateIdr,
      image: resolveUrl(vehicle.photoUrl, this.baseUrl),
      specs: parsedSpecs,
      description: vehicle.description,
      available: vehicle.status === "Available",
    };
  }

  /** Get vehicle by QR/barcode code (SVN:{vehicleId}) for public scan */
  async getVehicleByCode(code: string): Promise<{
    id: string;
    name: string;
    type: string;
    brand: string | null;
    model: string | null;
    year: number | null;
    category: string | null;
    plateNumber: string;
    dailyRateIdr: number;
    image: string | null;
    specs: Record<string, string> | null;
    description: string | null;
    available: boolean;
    displayName: string;
  } | null> {
    const vehicle = await this.repo.getVehicleByCode(code);
    if (!vehicle) return null;
    if (!this.isPublicVehiclePublishable(vehicle)) return null;

    const parsedSpecs = safeJsonParse<Record<string, string> | null>(
      typeof vehicle.specs === "string" ? vehicle.specs : null,
      vehicle.specs ? { details: String(vehicle.specs) } : null,
    );

    return {
      id: vehicle.id,
      name: vehicle.name,
      type: vehicle.type,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      category: vehicle.category,
      plateNumber: vehicle.plateNumber,
      dailyRateIdr: vehicle.dailyRateIdr,
      image: resolveUrl(vehicle.photoUrl, this.baseUrl),
      specs: parsedSpecs,
      description: vehicle.description,
      available: vehicle.status === "Available",
      displayName: this.getDisplayName(vehicle.type),
    };
  }

  // 5. Create Booking (public — no auth required, only API key)
  async createPublicBooking(
    data: CreatePublicBookingRequest,
    gatewayConfig: {
      vendor: GatewayVendor;
      config: Record<string, string>;
    },
    options?: { publicUserId?: string },
  ): Promise<{
    bookingId: string;
    bookingNumber: string;
    startDate: string;
    endDate: string;
    blocks: number;
    vehicleName: string;
    paymentPageUrl: string | null;
    qrString: string | null;
    xenditInvoiceId: string | null;
    totalAmount: number;
    paymentType: 'full' | 'dp';
    dpAmount: number;
    remainingAmount: number;
    paymentError: string | null;
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
      throw new ConflictError(
        "Vehicle is already booked for the selected dates. Please choose another vehicle or different dates.",
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

    // B2: enforce blacklist on the public surface. A blacklisted customer
    // must not be able to self-book.
    if (customer.isBlacklisted) {
      throw new ForbiddenError(
        `Akun ini di-blacklisted${customer.blacklistReason ? `: ${customer.blacklistReason}` : ''}`,
      );
    }

    // Calculate base amount using 12-hour blocks (not daily); C1: round
    const blocks = calculateTwelveHourBlocks(data.startDate, data.endDate);
    const baseAmount = Math.round(blocks * vehicle.dailyRateIdr);

    // ---- Equipment line items (per-block, same duration as the vehicle) ----
    let equipmentTotalAmount = 0;
    const equipmentRows: Array<{ equipmentId: string; quantity: number; unitPrice: number; totalPrice: number }> = [];
    const requestedEquipment = data.equipment ?? [];
    if (requestedEquipment.length > 0) {
      const ids = requestedEquipment.map((e) => e.equipmentId);
      const items = await this.repo.getActiveEquipmentByIds(ids);
      const byId = new Map(items.map((i) => [i.id, i]));
      for (const req of requestedEquipment) {
        const item = byId.get(req.equipmentId);
        if (!item)
          throw new ValidationError(`Equipment not found or inactive: ${req.equipmentId}`);
        // B3: validate requested quantity against available stock
        if (req.quantity > item.stock) {
          throw new ValidationError(
            `Stok tidak cukup untuk ${item.name}: tersedia ${item.stock}, diminta ${req.quantity}`,
          );
        }
        const unitPrice = item.dailyRateIdr;
        // C1: round each line to avoid float drift accumulation
        const totalPrice = Math.round(unitPrice * req.quantity * blocks);
        equipmentTotalAmount += totalPrice;
        equipmentRows.push({ equipmentId: item.id, quantity: req.quantity, unitPrice, totalPrice });
      }
    }
    equipmentTotalAmount = Math.round(equipmentTotalAmount);

    const totalAmount = Math.round(baseAmount + equipmentTotalAmount);

    // ---- Payment type: full vs DP (down-payment via Xendit allow_partial) ----
    const paymentType: 'full' | 'dp' = data.paymentType === 'dp' ? 'dp' : 'full';
    let dpAmount = 0;
    let remainingAmount = 0;
    if (paymentType === 'dp') {
      const dpPct = await this.configRepo.getNumber('dp_percentage', 30);
      dpAmount = Math.round((totalAmount * dpPct) / 100);
      remainingAmount = Math.round(totalAmount - dpAmount);
    }

    // B1: re-verify availability immediately before insert to narrow the
    // TOCTOU window (D1 has no transactions). A concurrent booking that
    // slipped in between the first check and here will be caught.
    const recheck = await this.repo.isVehicleAvailableForDates(
      data.vehicleId,
      data.startDate,
      data.endDate,
    );
    if (!recheck) {
      throw new ConflictError(
        "Vehicle was just booked by another customer. Please choose different dates or vehicle.",
      );
    }

    // Create booking
    const booking = await this.repo.createBooking({
      customerId: customer.id,
      vehicleId: data.vehicleId,
      startDate: data.startDate,
      endDate: data.endDate,
      status: "pending_payment",
      paymentTerms: paymentType === 'dp' ? "DP_Pickup" : "Full_Upfront",
      paymentStatus: "pending",
      paymentMethod: "online",
      baseAmount,
      equipmentTotalAmount,
      addonsAmount: 0,
      lateFee: 0,
      totalAmount,
      paymentType,
      dpAmount,
      remainingAmount,
      publicUserId: options?.publicUserId ?? null,
      currency: "IDR",
      notes: data.notes || null,
      createdBy: null,
    });

    // Persist equipment line items (unit price snapshotted)
    if (equipmentRows.length > 0) {
      await this.repo.createBookingEquipment(
        equipmentRows.map((r) => ({
          bookingId: booking.id,
          equipmentId: r.equipmentId,
          quantity: r.quantity,
          unitPrice: r.unitPrice,
          totalPrice: r.totalPrice,
        })),
      );
      // B3: decrement stock atomically. Best-effort without a transaction —
      // stock was validated above; this guards against a concurrent race.
      for (const r of equipmentRows) {
        await this.repo.decrementEquipmentStock(r.equipmentId, r.quantity);
      }
    }

    // Request payment page via the configured gateway
    let paymentPageUrl: string | null = null;
    let qrString: string | null = null;
    let xenditInvoiceId: string | null = null;

    const gateway = PaymentGatewayFactory.create(gatewayConfig.vendor, gatewayConfig.config);
    let paymentError: string | null = null;

    if (gateway.name !== 'manual') {
      try {
        // Use the payment method from request, default to 'Gateway' (all methods)
        const paymentMethod = data.paymentMethod ?? 'Gateway';

        // ---- Payment amount: DP creates invoice for dpAmount only, full creates for totalAmount.
        //      The payment page shows exactly what the customer needs to pay — no ambiguity.
        //      external_id = bookingNumber so the webhook can match it.
        const invoiceAmount = paymentType === 'dp' ? dpAmount : totalAmount;

        const result = await gateway.createPayment({
          amount: invoiceAmount,
          currency: 'IDR',
          method: paymentMethod,
          bookingId: booking.bookingNumber,
          customerEmail: customer.email ?? undefined,
          customerPhone: customer.phone,
          description: paymentType === 'dp'
            ? `DP Rental ${vehicle.name} (${blocks} block${blocks > 1 ? "s" : ""}) — DP ${dpAmount.toLocaleString('id-ID')}`
            : `Rental ${vehicle.name} (${blocks} block${blocks > 1 ? "s" : ""})`,
        });

        if (result.success) {
          paymentPageUrl = result.paymentUrl ?? null;
          qrString = result.qrString ?? null;
          xenditInvoiceId = result.transactionId ?? null;

          // Save payment page URL + Xendit invoice id to booking
          if (paymentPageUrl || xenditInvoiceId) {
            await this.repo.updateBooking(booking.id, {
              ...(paymentPageUrl ? { paymentPageUrl } : {}),
              ...(xenditInvoiceId ? { xenditInvoiceId } : {}),
            });
          }
        } else {
          paymentError = result.error?.message ?? 'Unknown payment error';
          console.error('[PublicAPI] Payment failed:', result.error);
        }
      } catch (error) {
        paymentError = error instanceof Error ? error.message : String(error);
        console.error('[PublicAPI] Payment exception:', error);
      }
    }

    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      startDate: data.startDate,
      endDate: data.endDate,
      blocks,
      vehicleName: vehicle.name,
      paymentPageUrl,
      qrString,
      xenditInvoiceId,
      totalAmount,
      paymentType,
      dpAmount,
      remainingAmount,
      paymentError: paymentError ?? (paymentPageUrl ? null : 'paymentPageUrl is null — gateway may not have been called'),
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
    return vehicles
      .filter((vehicle) => this.isPublicVehiclePublishable(vehicle))
      .map((v) => {
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
    return pkgs
      .filter((pkg) => this.isPublicPackagePublishable(pkg))
      .map(p => ({
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
        avatar: this.getInitials(r.name),
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
    return trailList
      .filter((trail) => this.isPublicTrailPublishable(trail))
      .map(t => ({
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
      subtitle: string | null;
      stages: Array<{ name: string; desc: string }> | null;
      checklist: string[] | null;
      culture: string | null;
      warning: string | null;
    };
  } | null> {
    const trail = await this.repo.getTrailById(trailId);
    if (!trail) return null;
    if (!this.isPublicTrailPublishable(trail)) return null;

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
        subtitle: trail.blogSubtitle ?? null,
        stages: safeJsonParse<Array<{ name: string; desc: string }> | null>(trail.blogStages, null),
        checklist: safeJsonParseStringArray(trail.blogChecklist).length > 0 ? safeJsonParseStringArray(trail.blogChecklist) : null,
        culture: trail.blogCulture ?? null,
        warning: trail.blogWarning ?? null,
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
  // A4: optionally verify the requester owns the booking by matching the
  // customer phone. Prevents enumeration of all bookings via sequential
  // booking numbers (SVN-2026-0001, 0002, ...).
  async getBookingStatus(
    bookingNumber: string,
    customerPhone?: string,
  ): Promise<{
    id: string; bookingNumber: string; status: string; paymentStatus: string | null;
    vehicleName: string; startDate: string; endDate: string;
    blocks: number;
    totalAmount: number; paidAt: string | null;
    paymentPageUrl: string | null; qrString: string | null;
    paymentType: string; dpAmount: number; remainingAmount: number;
    pickupConfirmed: boolean;
    isFullyPaid: boolean;
    isPickupTime: boolean;
  } | null> {
    const booking = await this.repo.findBookingByNumber(bookingNumber);
    if (!booking) return null;

    // Ownership check: if a phone was provided, it must match the booking's
    // customer phone. If it doesn't match, treat as not-found (avoid leaking
    // that the booking exists but belongs to someone else).
    if (customerPhone !== undefined) {
      const customer = await this.repo.findCustomerByPhone(customerPhone);
      if (!customer || customer.id !== booking.customerId) {
        return null;
      }
    }

    const vehicle = await this.repo.getVehicleById(booking.vehicleId);

    const paymentType = (booking as Record<string, unknown>).paymentType as string ?? 'full';
    const dpAmount = ((booking as Record<string, unknown>).dpAmount as number) ?? 0;
    const remainingAmount = ((booking as Record<string, unknown>).remainingAmount as number) ?? 0;
    const isFullyPaid = booking.paymentStatus === 'settlement' || booking.fullyPaidAt !== null;
    // NOTE: Do NOT use remainingAmount <= 0 here. Full-payment bookings initialize
    // remainingAmount to 0 at creation time, so that would incorrectly report unpaid
    // bookings as fully paid. Rely on paymentStatus/fullyPaidAt instead.

    // isPickupTime = current time >= booking startDate (ISO 8601 datetime string)
    const now = new Date();
    const start = new Date(booking.startDate);
    const isPickupTime = now >= start;

    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      vehicleName: vehicle?.name ?? 'Unknown',
      startDate: booking.startDate,
      endDate: booking.endDate,
      blocks: calculateTwelveHourBlocks(booking.startDate, booking.endDate),
      totalAmount: booking.totalAmount,
      paidAt: booking.paidAt,
      paymentPageUrl: (booking as Record<string, unknown>).paymentPageUrl as string | null ?? null,
      qrString: null,
      paymentType,
      dpAmount,
      remainingAmount,
      pickupConfirmed: booking.pickupConfirmed ?? false,
      isFullyPaid,
      isPickupTime,
    };
  }

  // ---- Equipment (public catalog) ----
  async getPublicEquipment(): Promise<Array<{
    id: string; name: string; category: string; description: string | null;
    dailyRateIdr: number; image: string | null; stock: number; minRentalDays: number;
  }>> {
    const items = await this.repo.getActiveEquipment();
    return items.map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      description: e.description,
      dailyRateIdr: e.dailyRateIdr,
      image: e.image,
      stock: e.stock,
      minRentalDays: e.minRentalDays,
    }));
  }

  async getPublicEquipmentById(id: string): Promise<{
    id: string; name: string; category: string; description: string | null;
    dailyRateIdr: number; image: string | null; stock: number; minRentalDays: number;
  } | null> {
    const e = await this.repo.getEquipmentById(id);
    if (!e) return null;
    return {
      id: e.id, name: e.name, category: e.category, description: e.description,
      dailyRateIdr: e.dailyRateIdr, image: e.image, stock: e.stock, minRentalDays: e.minRentalDays,
    };
  }

  // ---- Per-vehicle availability calendar (for the motor detail page) ----
  async getVehicleAvailabilityForMonth(vehicleId: string, month: string): Promise<{
    vehicleId: string; month: string; availableDates: string[]; bookedDates: string[];
  }> {
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) throw new ValidationError('Invalid month format (YYYY-MM)');
    const year = Number(match[1]);
    const mon = Number(match[2]);
    const mm = String(mon).padStart(2, '0');
    const monthStart = `${year}-${mm}-01`;
    const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate(); // day 0 of next month
    const monthEnd = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;

    const vehicle = await this.repo.getVehicleById(vehicleId);
    if (!vehicle) throw new ValidationError('Vehicle not found');
    if (!this.isPublicVehiclePublishable(vehicle)) {
      throw new ValidationError('Vehicle not found');
    }

    const bkgs = await this.repo.getVehicleBookingsInRange(vehicleId, monthStart, monthEnd);
    const bookedSet = new Set<string>();
    for (const b of bkgs) {
      // A booking occupies [startDate, endDate]. If endDate has time > 00:00,
      // that day is also occupied (conservative: prevents UI/backend mismatch).
      const start = parseDateStr(b.startDate);
      const end = parseDateStr(b.endDate, true); // round up if time > 00:00
      for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
        const ds = formatDateStr(d);
        if (ds >= monthStart && ds <= monthEnd) bookedSet.add(ds);
      }
    }

    const availableDates: string[] = [];
    const bookedDates: string[] = [];
    for (let day = 1; day <= lastDay; day++) {
      const ds = `${year}-${mm}-${String(day).padStart(2, '0')}`;
      (bookedSet.has(ds) ? bookedDates : availableDates).push(ds);
    }
    return { vehicleId, month, availableDates, bookedDates };
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

  /** Extract 2-letter initials from a name (e.g. "Ahmad Rizki" -> "AR") */
  private getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (name.slice(0, 2)).toUpperCase();
  }

  private isPublicVehiclePublishable(vehicle: {
    name: string;
    status: string;
    category?: string | null;
    description?: string | null;
    photoUrl?: string | null;
    dailyRateIdr?: number | null;
  }): boolean {
    if (vehicle.status !== 'Available') return false;
    if (!hasMeaningfulText(vehicle.name)) return false;
    if (looksLikeSeedOrQaData(vehicle.name)) return false;
    if (!hasMeaningfulText(vehicle.category)) return false;
    if (!hasMeaningfulText(vehicle.description)) return false;
    if (!hasMeaningfulText(vehicle.photoUrl)) return false;
    if ((vehicle.dailyRateIdr ?? 0) <= 0) return false;
    return true;
  }

  private isPublicPackagePublishable(pkg: {
    name: string;
    isActive?: boolean | null;
    description?: string | null;
    image?: string | null;
    duration?: string | null;
    price?: number | null;
  }): boolean {
    if (pkg.isActive === false) return false;
    if (!hasMeaningfulText(pkg.name)) return false;
    if (looksLikeSeedOrQaData(pkg.name)) return false;
    if (!hasMeaningfulText(pkg.description)) return false;
    if (!hasMeaningfulText(pkg.image)) return false;
    if (!hasMeaningfulText(pkg.duration)) return false;
    if ((pkg.price ?? 0) <= 0) return false;
    return true;
  }

  private isPublicTrailPublishable(trail: {
    name: string;
    isActive?: boolean | null;
    description?: string | null;
    terrain?: string | null;
    difficulty?: string | null;
    recommended?: string | null;
    image?: string | null;
  }): boolean {
    if (trail.isActive === false) return false;
    if (!hasMeaningfulText(trail.name)) return false;
    if (looksLikeSeedOrQaData(trail.name)) return false;
    if (!hasMeaningfulText(trail.description)) return false;
    if (!hasMeaningfulText(trail.terrain)) return false;
    if (!hasMeaningfulText(trail.difficulty)) return false;
    if (!hasMeaningfulText(trail.recommended)) return false;
    if (!hasMeaningfulText(trail.image)) return false;
    return true;
  }
}
