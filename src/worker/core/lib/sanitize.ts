/**
 * Strip HTML tags and stray angle brackets from free-text input.
 *
 * Defense-in-depth on top of React's output escaping (which already prevents
 * execution). This ensures raw `<script>...</script>` payloads are not persisted
 * verbatim, so a non-React surface (CSV export, email, server-rendered template)
 * can't accidentally execute them.
 *
 * ponytail: not a full HTML sanitizer — does not entity-encode quotes or handle
 * attribute injection. Fine for free-text fields rendered as text. Upgrade to a
 * dedicated sanitizer (e.g. DOMPurify) if these fields are ever rendered as HTML.
 */
export function sanitizeText(input: string): string {
	return input.replace(/<\/?\w[^>]*>/g, '').replace(/[<>]/g, '').trim();
}
