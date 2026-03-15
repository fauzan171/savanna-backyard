import { Hono, Context } from "hono";
import { authMiddleware } from "@/worker/core/middleware/auth";
import { createDb } from "@/worker/core/database";
import { ConfigRepository } from "@/worker/core/repositories/config.repository";
import { PaymentsRepository } from "./payments.repository";
import { PaymentsService } from "./payments.service";
import { BookingsRepository } from "../bookings/bookings.repository";
import {
  validateBody,
  validateQuery,
  getValidatedBody,
  getValidatedQuery,
} from "@/worker/core/middleware/validator";
import {
  PaymentGatewayFactory,
  type GatewayVendor,
  type PaymentGateway,
} from "@/worker/core/services/payment-gateway";
import {
  createPaymentSchema,
  verifyPaymentSchema,
  rejectPaymentSchema,
  listPaymentsQuerySchema,
  type CreatePaymentRequest,
  type VerifyPaymentRequest,
  type RejectPaymentRequest,
  type ListPaymentsQuery,
} from "./payments.dto";

// Type for storing services in context
type PaymentsVariables = {
  configRepository: ConfigRepository;
  paymentsService: PaymentsService;
  user: { userId: string; role: "SUPER_ADMIN" | "STAFF" };
};

type PaymentsEnv = { Bindings: Env; Variables: PaymentsVariables };

// Middleware to inject services into context
export const paymentsServicesMiddleware =
  () => async (c: Context<PaymentsEnv>, next: () => Promise<void>) => {
    const db = createDb(c.env.DB);
    const configRepository = new ConfigRepository(db);
    const paymentsRepository = new PaymentsRepository(db);
    const bookingsRepository = new BookingsRepository(db);
    const paymentsService = new PaymentsService(
      paymentsRepository,
      bookingsRepository,
    );

    c.set("configRepository", configRepository);
    c.set("paymentsService", paymentsService);
    await next();
  };

// Helper to get configured gateway
async function getGateway(
  configRepo: ConfigRepository,
): Promise<PaymentGateway> {
  const vendor =
    ((await configRepo.getValue("payment_gateway_vendor")) as GatewayVendor) ??
    "manual";

  const config: Record<string, string> = {};

  if (vendor === "midtrans") {
    config.serverKey = (await configRepo.getValue("midtrans_server_key")) ?? "";
    config.clientKey = (await configRepo.getValue("midtrans_client_key")) ?? "";
    config.isProduction =
      (await configRepo.getValue("midtrans_is_production")) ?? "false";
  } else if (vendor === "xendit") {
    config.apiKey = (await configRepo.getValue("xendit_api_key")) ?? "";
    config.isProduction =
      (await configRepo.getValue("xendit_is_production")) ?? "false";
  }

  return PaymentGatewayFactory.create(vendor, config);
}

// Route handlers - Gateway
const getGatewayStatusHandler = async (c: Context<PaymentsEnv>) => {
  const configRepo = c.get("configRepository");

  const vendor =
    (await configRepo.getValue("payment_gateway_vendor")) ?? "manual";
  const isConfigured = vendor !== "manual";

  // Get supported methods based on vendor
  const supportedMethods =
    vendor === "manual"
      ? ["BankTransfer", "Cash"]
      : ["QRIS", "Gateway", "BankTransfer"];

  return c.json({
    success: true,
    data: {
      vendor,
      isConfigured,
      supportedMethods,
    },
  });
};

const handleWebhookHandler = async (c: Context<PaymentsEnv>) => {
  const configRepo = c.get("configRepository");
  const vendor = c.req.param("vendor") as GatewayVendor;

  // Validate vendor matches configured gateway
  const configuredVendor =
    (await configRepo.getValue("payment_gateway_vendor")) ?? "manual";
  if (vendor !== configuredVendor) {
    return c.json(
      {
        success: false,
        error: {
          code: "INVALID_VENDOR",
          message: "Webhook vendor does not match configured gateway",
        },
      },
      400,
    );
  }

  try {
    const gateway = await getGateway(configRepo);
    const payload = await c.req.json();
    const headers = Object.fromEntries(c.req.raw.headers);

    const webhookResult = await gateway.handleWebhook(payload, headers);
    const service = c.get("paymentsService");
    const data = payload as Record<string, string>;

    const db = createDb(c.env.DB);
    const bookingsRepo = new BookingsRepository(db);
    const booking = await bookingsRepo.findByBookingNumber(data.order_id);

    if (booking) {
      try {
        const created = await service.create({
          bookingId: booking.id,
          amount: webhookResult.amount,
          currency: "IDR",
          method: data.payment_type === "qris" ? "QRIS" : "BankTransfer",
          transactionReference: webhookResult.transactionId,
        });

        if (webhookResult.status === "Verified") {
          await service.verify(created.id, "system", {
            notes: "Auto-verified via Midtrans webhook",
          });
        }
      } catch (e) {
        console.log("Payment already exists, skipping:", e);
      }
    }

    return c.json({ success: true, message: "Webhook processed" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return c.json(
      {
        success: false,
        error: {
          code: "WEBHOOK_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      },
      500,
    );
  }
};

// Route handlers - Payment Management
const listPaymentsHandler = async (c: Context<PaymentsEnv>) => {
  const service = c.get("paymentsService");
  const query = getValidatedQuery<ListPaymentsQuery>(c);
  const result = await service.list(query);
  return c.json({ success: true, data: result });
};

const getPaymentByIdHandler = async (c: Context<PaymentsEnv>) => {
  const service = c.get("paymentsService");
  const id = c.req.param("id");
  const result = await service.getById(id);

  if (!result) {
    return c.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Payment not found" },
      },
      404,
    );
  }

  return c.json({ success: true, data: result });
};

const createPaymentHandler = async (c: Context<PaymentsEnv>) => {
  const service = c.get("paymentsService");
  const body = getValidatedBody<CreatePaymentRequest>(c);
  const result = await service.create(body);
  return c.json({ success: true, data: result }, 201);
};

const verifyPaymentHandler = async (c: Context<PaymentsEnv>) => {
  const service = c.get("paymentsService");
  const user = c.get("user");
  const id = c.req.param("id");
  const body = getValidatedBody<VerifyPaymentRequest>(c);
  const result = await service.verify(id, user.userId, body);
  return c.json({ success: true, data: result });
};

const rejectPaymentHandler = async (c: Context<PaymentsEnv>) => {
  const service = c.get("paymentsService");
  const id = c.req.param("id");
  const body = getValidatedBody<RejectPaymentRequest>(c);
  const result = await service.reject(id, body);
  return c.json({ success: true, data: result });
};

const getPendingPaymentsHandler = async (c: Context<PaymentsEnv>) => {
  const service = c.get("paymentsService");
  const result = await service.getPendingPayments();
  return c.json({ success: true, data: result });
};

const getPaymentStatsHandler = async (c: Context<PaymentsEnv>) => {
  const service = c.get("paymentsService");
  const result = await service.getStats();
  return c.json({ success: true, data: result });
};

const getBookingPaymentSummaryHandler = async (c: Context<PaymentsEnv>) => {
  const service = c.get("paymentsService");
  const bookingId = c.req.param("bookingId");
  const result = await service.getBookingSummary(bookingId);
  return c.json({ success: true, data: result });
};

// Factory function to create payments router
export function createPaymentsRouter(): Hono<PaymentsEnv> {
  const router = new Hono<PaymentsEnv>();

  // Apply services middleware to all payments routes
  router.use("*", paymentsServicesMiddleware());

  // Gateway status endpoint (requires auth)
  router.get("/gateway/status", authMiddleware(), getGatewayStatusHandler);

  // Webhook endpoint (no auth - validated by signature)
  router.post("/webhooks/:vendor", handleWebhookHandler);

  // Payment management endpoints (all require auth)
  router.use("*", authMiddleware());

  // Get pending payments
  router.get("/pending", getPendingPaymentsHandler);

  // Get payment statistics
  router.get("/stats", getPaymentStatsHandler);

  // List payments (with pagination and filters)
  router.get("/", validateQuery(listPaymentsQuerySchema), listPaymentsHandler);

  // Get payment by ID
  router.get("/:id", getPaymentByIdHandler);

  // Create payment
  router.post("/", validateBody(createPaymentSchema), createPaymentHandler);

  // Verify payment
  router.post(
    "/:id/verify",
    validateBody(verifyPaymentSchema),
    verifyPaymentHandler,
  );

  // Reject payment
  router.post(
    "/:id/reject",
    validateBody(rejectPaymentSchema),
    rejectPaymentHandler,
  );

  // Booking payment summary - mounted at /bookings/:bookingId/payments/summary
  // This endpoint will be accessed via the bookings router

  return router;
}

// Create a separate router for booking payment endpoints
export function createBookingPaymentsRouter(): Hono<PaymentsEnv> {
  const router = new Hono<PaymentsEnv>();

  router.use("*", paymentsServicesMiddleware());
  router.use("*", authMiddleware());

  // Get booking payment summary
  router.get("/summary", getBookingPaymentSummaryHandler);

  return router;
}
