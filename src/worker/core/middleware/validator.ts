import { Context, Next } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../types/errors';

// Validate request body against a Zod schema
export function validateBody<T>(schema: z.ZodSchema<T>) {
	return async (c: Context, next: Next) => {
		let body: unknown;
		try {
			const text = await c.req.text();
			body = text ? JSON.parse(text) : {};
		} catch {
			throw new ValidationError('Invalid JSON body');
		}

		const result = schema.safeParse(body);
		if (!result.success) {
			throw new ValidationError(
				result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
			);
		}

		c.set('body', result.data);
		await next();
	};
}

// Validate query parameters against a Zod schema
export function validateQuery<T>(schema: z.ZodSchema<T>) {
	return async (c: Context, next: Next) => {
		const query = c.req.query();
		const result = schema.safeParse(query);

		if (!result.success) {
			throw new ValidationError(
				result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
			);
		}

		c.set('query', result.data);
		await next();
	};
}

// Get validated body from context
export function getValidatedBody<T>(c: Context): T {
	return c.get('body') as T;
}

// Get validated query from context
export function getValidatedQuery<T>(c: Context): T {
	return c.get('query') as T;
}
