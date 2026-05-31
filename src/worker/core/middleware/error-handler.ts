import { Context, Next } from 'hono';
import { AppError } from '../types/errors';
import type { ApiError } from '../types';

export async function errorHandler(c: Context, next: Next) {
	try {
		await next();
	} catch (error) {
		console.error('Error:', error);

		if (error instanceof AppError) {
			const response: ApiError = {
				success: false,
				message: error.message,
				error: {
					message: error.message,
					code: error.code,
				},
			};
			return c.json(response, error.statusCode as 400 | 401 | 403 | 404 | 409 | 500);
		}

		// Zod validation error
		if (error instanceof Error && error.name === 'ZodError') {
			const response: ApiError = {
				success: false,
				message: 'Validation failed',
				error: {
					message: 'Validation failed',
					code: 'VALIDATION_ERROR',
					details: (error as unknown as { errors: unknown[] }).errors,
				},
			};
			return c.json(response, 400);
		}

		// Generic error
		const response: ApiError = {
			success: false,
			message: 'Internal server error',
			error: {
				message: 'Internal server error',
				code: 'INTERNAL_ERROR',
			},
		};
		return c.json(response, 500);
	}
}
