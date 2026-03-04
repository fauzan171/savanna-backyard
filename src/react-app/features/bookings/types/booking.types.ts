import type {
  BaseEntity,
  UserReference,
} from "@/react-app/features/shared/types/api.types";
import { z } from "zod";

// ============================================
// BOOKING STATUS & ENUMS
// ============================================

export type BookingStatus =
  | "Pending"
  | "Confirmed"
  | "Active"
  | "Completed"
  | "Cancelled";
export type PaymentTerms =
  | "DP_Pickup"
  | "Full_Upfront"
  | "DP_After"
  | "Flexible";
export type Currency = "IDR" | "USD";

// ============================================
// BOOKING ENTITY TYPES
// ============================================

/** Basic booking entity */
export interface Booking extends BaseEntity {
  bookingNumber: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    isBlacklisted: boolean;
  };
  vehicleId: string;
  vehicle: {
    id: string;
    name: string;
    plateNumber: string;
    type: string;
    dailyRateIdr: number;
    dailyRateUsd: number | null;
    photoUrl: string | null;
  };
  startDate: string; // ISO date
  endDate: string; // ISO date
  actualReturnDate: string | null;
  status: BookingStatus;
  paymentTerms: PaymentTerms;
  currency: Currency;
  baseAmount: number;
  addonsAmount: number;
  lateFee: number;
  totalAmount: number;
  notes: string | null;
  createdBy: UserReference;
  cancelledAt: string | null;
}

/** Booking with full details (for detail page) */
export interface BookingWithDetails extends Booking {
  addons: BookingAddon[];
  payments: BookingPayment[];
  paymentSummary: PaymentSummary;
  statusHistory: StatusHistoryEntry[];
}

/** Booking add-on */
export interface BookingAddon {
  id: string;
  type: "TourGuide" | "SafetyGear" | "PickupDropoff" | "Package" | "Other";
  description: string;
  amount: number;
  isMandatory: boolean;
  createdAt: string;
}

/** Payment reference in booking */
export interface BookingPayment {
  id: string;
  amount: number;
  currency: Currency;
  method: "QRIS" | "Gateway" | "Bank_Transfer" | "Cash";
  status: "Pending" | "Verified" | "Failed";
  transactionReference: string | null;
  verifiedBy: UserReference | null;
  verifiedAt: string | null;
  createdAt: string;
}

/** Payment summary */
export interface PaymentSummary {
  totalPaid: number;
  pendingAmount: number;
  remaining: number;
  isFullyPaid: boolean;
  paymentProgress: number;
}

/** Status history entry */
export interface StatusHistoryEntry {
  id: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  notes: string | null;
  changedBy: UserReference;
  createdAt: string;
}

// ============================================
// API REQUEST TYPES
// ============================================

export interface CreateBookingRequest {
  customerId: string;
  vehicleId: string;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string; // ISO date YYYY-MM-DD
  paymentTerms: PaymentTerms;
  currency?: Currency;
  addons?: CreateAddonRequest[];
  notes?: string;
}

export interface UpdateBookingRequest {
  notes?: string;
}

export interface CreateAddonRequest {
  type: "TourGuide" | "SafetyGear" | "PickupDropoff" | "Package" | "Other";
  description: string;
  amount: number;
  isMandatory?: boolean;
}

export interface ExtendBookingRequest {
  newEndDate: string; // ISO date
  notes?: string;
}

export interface ConfirmBookingRequest {
  notes?: string;
}

export interface StartRentalRequest {
  pickupNotes?: string;
  startKm?: number;
}

export interface CompleteRentalRequest {
  actualReturnDate: string; // ISO date
  returnKm?: number;
  returnNotes?: string;
  damageNotes?: string;
}

export interface CancelBookingRequest {
  reason: string;
}

// ============================================
// LIST FILTERS
// ============================================

export interface BookingFilters {
  status?: BookingStatus;
  customerId?: string;
  vehicleId?: string;
  startDateFrom?: string;
  startDateTo?: string;
  search?: string;
}

// ============================================
// AVAILABILITY & PRICING
// ============================================

export interface AvailabilityCheckParams {
  vehicleId: string;
  startDate: string;
  endDate: string;
  excludeBookingId?: string;
}

export interface AvailabilityCheckResult {
  isAvailable: boolean;
  conflicts: Array<{
    bookingId: string;
    bookingNumber: string;
    startDate: string;
    endDate: string;
  }>;
}

export interface PriceCalculationParams {
  vehicleId: string;
  startDate: string;
  endDate: string;
  currency?: Currency;
  addons?: CreateAddonRequest[];
}

export interface PriceCalculationResult {
  baseAmount: number;
  addonsAmount: number;
  totalAmount: number;
  durationDays: number;
  dailyRate: number;
  currency: Currency;
  breakdown: {
    vehicle: {
      name: string;
      dailyRate: number;
      days: number;
      total: number;
    };
    addons: Array<{
      type: string;
      description: string;
      amount: number;
    }>;
  };
}

export interface ExtensionCalculationParams {
  bookingId: string;
  newEndDate: string;
}

export interface ExtensionCalculationResult {
  currentEndDate: string;
  newEndDate: string;
  additionalDays: number;
  additionalAmount: number;
  newTotalAmount: number;
  dailyRate: number;
  currency: Currency;
}

// ============================================
// FORM TYPES
// ============================================

export type BookingFormData = Omit<
  CreateBookingRequest,
  "startDate" | "endDate"
> & {
  startDate: Date;
  endDate: Date;
};

export type ExtendFormData = {
  newEndDate: Date;
  notes?: string;
};

// ============================================
// ZOD SCHEMAS
// ============================================

export const paymentTermsSchema = z.enum([
  "DP_Pickup",
  "Full_Upfront",
  "DP_After",
  "Flexible",
]);
export const currencySchema = z.enum(["IDR", "USD"]);
export const addonTypeSchema = z.enum([
  "TourGuide",
  "SafetyGear",
  "PickupDropoff",
  "Package",
  "Other",
]);

export const createAddonSchema = z.object({
  type: addonTypeSchema,
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  isMandatory: z.boolean().optional(),
});

export const bookingFormSchema = z
  .object({
    customerId: z.string().min(1, "Customer is required"),
    vehicleId: z.string().min(1, "Vehicle is required"),
    startDate: z.date({
      required_error: "Start date is required",
      invalid_type_error: "Invalid start date",
    }),
    endDate: z.date({
      required_error: "End date is required",
      invalid_type_error: "Invalid end date",
    }),
    paymentTerms: z.enum(
      ["DP_Pickup", "Full_Upfront", "DP_After", "Flexible"],
      {
        required_error: "Payment terms are required",
      },
    ),
    currency: currencySchema.optional(),
    addons: z.array(createAddonSchema).optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data: { startDate: Date; endDate: Date }) =>
      data.endDate >= data.startDate,
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    },
  );

export const extendBookingSchema = z
  .object({
    newEndDate: z.date({
      required_error: "New end date is required",
    }),
    notes: z.string().optional(),
  })
  .refine((data) => data.newEndDate > new Date(), {
    message: "New end date must be in the future",
    path: ["newEndDate"],
  });

export const cancelBookingSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

export const confirmBookingSchema = z.object({
  notes: z.string().optional(),
});

export const startRentalSchema = z.object({
  pickupNotes: z.string().optional(),
  startKm: z.number().int().positive().optional(),
});

export const completeRentalSchema = z.object({
  actualReturnDate: z.string().min(1, "Return date is required"),
  returnKm: z.number().int().positive().optional(),
  returnNotes: z.string().optional(),
  damageNotes: z.string().optional(),
});

// ============================================
// STATUS TRANSITIONS
// ============================================

export const statusTransitions: Record<BookingStatus, BookingStatus[]> = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Active", "Cancelled"],
  Active: ["Completed", "Cancelled"],
  Completed: [],
  Cancelled: [],
};

export function canTransitionTo(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  return statusTransitions[from]?.includes(to) ?? false;
}

export function getAvailableActions(status: BookingStatus): Array<{
  action: string;
  label: string;
  variant: "default" | "destructive" | "outline";
}> {
  const actions: Array<{
    action: string;
    label: string;
    variant: "default" | "destructive" | "outline";
  }> = [];

  switch (status) {
    case "Pending":
      actions.push({ action: "confirm", label: "Confirm", variant: "default" });
      actions.push({
        action: "cancel",
        label: "Cancel",
        variant: "destructive",
      });
      break;
    case "Confirmed":
      actions.push({
        action: "start",
        label: "Start Rental",
        variant: "default",
      });
      actions.push({
        action: "cancel",
        label: "Cancel",
        variant: "destructive",
      });
      break;
    case "Active":
      actions.push({
        action: "complete",
        label: "Complete",
        variant: "default",
      });
      actions.push({ action: "extend", label: "Extend", variant: "outline" });
      actions.push({
        action: "cancel",
        label: "Cancel",
        variant: "destructive",
      });
      break;
    case "Completed":
    case "Cancelled":
      // No actions available
      break;
  }

  return actions;
}
