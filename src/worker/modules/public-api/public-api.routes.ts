import { Hono, Context } from 'hono';
import { createDb } from '@/worker/core/database';
import { PublicApiRepository } from './public-api.repository';
import { PublicApiService } from './public-api.service';
import { ConfigRepository } from '@/worker/core/repositories/config.repository';
import { apiKeyMiddleware } from '@/worker/core/middleware/api-key';
import { validateBody, validateQuery, getValidatedBody, getValidatedQuery } from '@/worker/core/middleware/validator';
import { cors } from 'hono/cors';
import {
  submitLeadSchema,
  checkAvailabilityQuerySchema,
  getVehicleTypesQuerySchema,
  type SubmitLeadRequest,
  type CheckAvailabilityQuery,
  type GetVehicleTypesQuery,
} from './public-api.dto';

// Type for storing services in context
type PublicApiVariables = {
  publicApiService: PublicApiService;
};

type PublicApiEnv = { Bindings: Env; Variables: PublicApiVariables };

// Middleware to inject public API services into context
export const publicApiServicesMiddleware = () => async (c: Context<PublicApiEnv>, next: () => Promise<void>) => {
  const db = createDb(c.env.DB);
  const publicApiRepository = new PublicApiRepository(db);
  const configRepository = new ConfigRepository(db);
  const publicApiService = new PublicApiService(publicApiRepository, configRepository);

  c.set('publicApiService', publicApiService);
    await next();
};

// Route handlers
const submitLeadHandler = async (c: Context<PublicApiEnv>) => {
  const service = c.get('publicApiService');
    const body = getValidatedBody<SubmitLeadRequest>(c);
    const result = await service.submitLead(body);

    return c.json({
      success: true,
      message: 'Lead submitted successfully',
      data: result,
    }, 201);
};

const checkAvailabilityHandler = async (c: Context<PublicApiEnv>) => {
    const service = c.get('publicApiService');
    const query = getValidatedQuery<CheckAvailabilityQuery>(c);
    const result = await service.checkAvailability(query);

    return c.json({
      success: true,
      data: result,
    });
};

const getVehicleTypesHandler = async (c: Context<PublicApiEnv>) => {
    const service = c.get('publicApiService');
    const query = getValidatedQuery<GetVehicleTypesQuery>(c);
    const result = await service.getVehicleTypes(query);

    return c.json({
      success: true,
      data: result,
    });
};

const getVehicleDetailsHandler = async (c: Context<PublicApiEnv>) => {
    const service = c.get('publicApiService');
    const id = c.req.param('id');
    const result = await service.getVehicleDetails(id);

    if (!result) {
        return c.json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Vehicle not found',
          },
        }, 404);
    }

    return c.json({
      success: true,
      data: result,
    });
};

// Factory function to create public API router
export function createPublicApiRouter(): Hono<PublicApiEnv> {
    const router = new Hono<PublicApiEnv>();

    // Apply services middleware to all public API routes
    router.use('*', publicApiServicesMiddleware());

    // CORS: Allow configured origins for public API
    // Allowed origins should be set via ALLOWED_PUBLIC_API_ORIGINS env var (comma-separated)
    router.use('*', cors({
        origin: (origin, c) => {
            const allowedOrigins = c.env.ALLOWED_PUBLIC_API_ORIGINS?.split(',').map((o: string) => o.trim()) ?? [];
            // Check if origin is in allowed list
            if (origin && allowedOrigins.includes(origin)) {
                return origin;
            }
            // Also allow localhost for development
            if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
                return origin;
            }
            return allowedOrigins[0] ?? null;
        },
        credentials: false,
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'X-API-Key'],
    }));

    // All public API routes require API key authentication
    router.use('*', apiKeyMiddleware());

    // Define routes
    // POST /api/v1/public/leads - Submit lead from web forms
    router.post('/leads', validateBody(submitLeadSchema), submitLeadHandler);

    // GET /api/v1/public/availability - Check vehicle availability
    router.get('/availability', validateQuery(checkAvailabilityQuerySchema), checkAvailabilityHandler);

    // GET /api/v1/public/vehicle-types - Get available vehicle types
    router.get('/vehicle-types', validateQuery(getVehicleTypesQuerySchema), getVehicleTypesHandler);

    // GET /api/v1/public/vehicles/:id - Get vehicle details (filtered)
    router.get('/vehicles/:id', getVehicleDetailsHandler);

    return router;
}
