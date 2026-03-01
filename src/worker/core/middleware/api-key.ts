import { Context, Next } from 'hono';
import { UnauthorizedError } from '../types/errors';
import { ConfigRepository } from '../repositories/config.repository';
import { createDb } from '../database';

// Extend Hono's context variables
declare module 'hono' {
    interface ContextVariableMap {
        apiKeyValidated: boolean;
    }
}

/**
 * API Key Authentication Middleware
 * Validates X-API-Key header against system_configuration table
 * Key: public_api_key (single key for v1)
 */
export function apiKeyMiddleware() {
    return async (c: Context, next: Next) => {
        const apiKey = c.req.header('X-API-Key');

        if (!apiKey) {
            throw new UnauthorizedError('API key is required. Provide X-API-Key header.');
        }

        // Create db and config repo
        const db = createDb(c.env.DB);
        const configRepo = new ConfigRepository(db);

        // Check if public API is enabled
        const isEnabled = await configRepo.getBoolean('public_api_enabled', false);
        if (!isEnabled) {
            throw new UnauthorizedError('Public API is currently disabled');
        }

        // Validate API key
        const validApiKey = await configRepo.getValue('public_api_key');
        if (!validApiKey || apiKey !== validApiKey) {
            throw new UnauthorizedError('Invalid API key');
        }

        // Mark as validated
        c.set('apiKeyValidated', true);

        await next();
    };
}

/**
 * Optional API Key middleware - allows requests without key
 * but validates if key is provided
 */
export function optionalApiKeyMiddleware() {
    return async (c: Context, next: Next) => {
        const apiKey = c.req.header('X-API-Key');

        if (apiKey) {
            // Key provided, validate it
            const db = createDb(c.env.DB);
            const configRepo = new ConfigRepository(db);

            const validApiKey = await configRepo.getValue('public_api_key');
            if (validApiKey && apiKey === validApiKey) {
                c.set('apiKeyValidated', true);
            }
        }

        await next();
    };
}
