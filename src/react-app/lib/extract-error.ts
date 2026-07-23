/**
 * Extracts a human-readable error message from a thrown error of unknown shape.
 *
 * The API client (lib/api-client.ts) throws either:
 *   - `new Error(error.error?.message)` — for HTTP error responses shaped like
 *     `{ success: false, error: { code, message } }`
 *   - `new Error('Unauthorized')` — for 401 responses
 *
 * Some mutations throw the raw response object instead of an Error. This helper
 * normalizes all of those shapes into a single string suitable for a toast.
 */
export function extractApiError(error: unknown, fallback = 'Something went wrong'): string {
	if (error == null) return fallback;

	// Standard Error with a message from the API client
	if (error instanceof Error) {
		return error.message || fallback;
	}

	// Raw API error response: { success: false, error: { code, message } }
	if (typeof error === 'object') {
		const e = error as {
			error?: { message?: string };
			message?: string;
		};
		if (e.error?.message) return e.error.message;
		if (e.message) return e.message;
	}

	if (typeof error === 'string') return error;

	return fallback;
}
