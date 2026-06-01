import { Context, Next } from 'hono';
import { AppError } from '../types/errors';
import type { ApiError } from '../types';

function buildErrorResponse(error: unknown): { response: ApiError; status: number } {
	if (error instanceof AppError) {
		return {
			status: error.statusCode as 400 | 401 | 403 | 404 | 409 | 500,
			response: {
				success: false,
				message: error.message,
				error: {
					message: error.message,
					code: error.code,
				},
			},
		};
	}

	if (error instanceof Error && error.name === 'ZodError') {
		return {
			status: 400,
			response: {
				success: false,
				message: 'Validation failed',
				error: {
					message: 'Validation failed',
					code: 'VALIDATION_ERROR',
					details: (error as unknown as { errors: unknown[] }).errors,
				},
			},
		};
	}

	return {
		status: 500,
		response: {
			success: false,
			message: 'Internal server error',
			error: {
				message: 'Internal server error',
				code: 'INTERNAL_ERROR',
			},
		},
	};
}

// Hono onError handler (catches errors from route handlers)
export function handleError(error: Error, c: Context) {
	console.error('Route error:', error);
	const { status, response } = buildErrorResponse(error);
	return c.json(response, status as 400 | 401 | 403 | 404 | 409 | 500);
}

// Middleware error handler (catches errors from middleware chain)
export async function errorHandler(c: Context, next: Next) {
	try {
		await next();
	} catch (error) {
		console.error('Middleware error:', error);
		const { status, response } = buildErrorResponse(error);
		return c.json(response, status as 400 | 401 | 403 | 404 | 409 | 500);
	}
}
