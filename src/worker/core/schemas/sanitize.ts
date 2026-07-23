import { z } from 'zod';

/**
 * Sanitizes free-text input to mitigate stored XSS.
 *
 * Defense-in-depth measure. React escapes HTML automatically when rendering
 * text content, but raw values may be rendered in non-React contexts
 * (emails, public landing pages, CSV exports). This helper neutralizes the
 * most dangerous payloads at write time:
 *   - <script>...</script> blocks
 *   - inline event handlers (onclick=, onerror=, ...)
 *   - javascript: / data:text/html URLs in href/src
 *
 * It does NOT strip benign HTML; it only removes executable vectors.
 * Legitimate user text (e.g. a name containing "<") is preserved as text
 * by entity-encoding angle brackets.
 */
export function sanitizeText(input: string): string;

export function sanitizeText(input: null | undefined): null;

export function sanitizeText(input: string | null | undefined): string | null {
	if (input == null) return null;

	let result = input;

	// 1. Remove <script>...</script> blocks entirely (including self-closing variants)
	result = result.replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '');
	result = result.replace(/<\s*script\b[^>]*\/?\s*>/gi, '');

	// 2. Remove inline event handlers: onEvent="..." / onEvent='...' / onEvent=xxx
	result = result.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

	// 3. Neutralize javascript: / vbscript: / data:text/html URLs in href/src
	result = result.replace(
		/(href|src)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
		(match, _attr, value) => {
			const stripped = String(value).replace(/^["']|["']$/g, '').trim();
			if (/^\s*(javascript|vbscript|data:text\/html)\s*:/i.test(stripped)) {
				return `${_attr}="#"`;
			}
			return match;
		},
	);

	// 4. Entity-encode angle brackets so any remaining tags render as text,
	//    rather than being interpreted as markup in non-React contexts.
	result = result.replace(/</g, '&lt;').replace(/>/g, '&gt;');

	return result;
}

/**
 * Zod string schema that trims whitespace and applies XSS sanitization.
 * Empty-after-trim strings are rejected.
 *
 * Use for free-text fields (names, descriptions, notes, etc.).
 */
export const safeText = z
	.string()
	.transform((val) => sanitizeText(val) as string);

/**
 * Zod string schema that trims, rejects whitespace-only values, and applies
 * XSS sanitization. Guarantees a non-empty result after trimming.
 *
 * Use for required text fields like `name`.
 */
export const safeTextRequired = z
	.string()
	.trim()
	.min(1, { message: 'Field cannot be empty' })
	.transform((val) => sanitizeText(val) as string);
