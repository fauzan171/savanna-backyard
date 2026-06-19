import { Context, Next } from 'hono';

/**
 * Simple in-memory rate limiter for Cloudflare Workers.
 * Uses a Map to track request counts per IP within a time window.
 *
 * Note: This resets on each worker restart. For persistent rate limiting,
 * use Cloudflare's built-in Rate Limiting rules in the dashboard.
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
  /** Maximum requests within the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Optional key prefix for identification */
  prefix?: string;
}

/**
 * Rate limiting middleware.
 * Tracks requests per IP address within a sliding window.
 */
export function rateLimit(config: RateLimitConfig) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const key = `${config.prefix || 'rl'}:${ip}`;
    const now = Date.now();

    const entry = requestCounts.get(key);

    if (entry && entry.resetAt > now) {
      if (entry.count >= config.maxRequests) {
        c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
        return c.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests. Please try again later.',
            },
          },
          429,
        );
      }
      entry.count++;
    } else {
      requestCounts.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    }

    await next();
  };
}

/**
 * Strict rate limit for login endpoint.
 * Max 5 attempts per 15 minutes per IP.
 */
export function loginRateLimit() {
  return rateLimit({ maxRequests: 5, windowSeconds: 900, prefix: 'login' });
}

/**
 * Moderate rate limit for public API.
 * Max 100 requests per minute per IP.
 */
export function publicApiRateLimit() {
  return rateLimit({ maxRequests: 100, windowSeconds: 60, prefix: 'public' });
}
