import { z } from 'zod';

/**
 * Validates a URL or relative path for uploaded assets.
 *
 * The upload endpoint returns relative paths like `/api/v1/uploads/2026-06-15-abc.png`,
 * but `z.string().url()` rejects those because they lack a protocol/host.
 * This schema accepts both absolute URLs and relative paths starting with `/`.
 */
export const urlOrPath = z
	.string()
	.min(1)
	.refine(
		(val) => {
			// Accept relative paths starting with "/"
			if (val.startsWith('/')) return true;
			// Accept absolute URLs (http/https)
			try {
				new URL(val);
				return true;
			} catch {
				return false;
			}
		},
		{ message: 'Invalid url' }
	);
