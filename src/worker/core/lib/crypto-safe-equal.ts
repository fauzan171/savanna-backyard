/**
 * Constant-time string comparison to prevent timing side-channel attacks.
 *
 * Standard `===` returns early on the first byte mismatch, leaking how many
 * leading characters of a secret are correct. This helper compares in
 * constant time regardless of where the first difference occurs.
 *
 * Uses the double-HMAC approach: both inputs are HMAC'd with a random key
 * before comparison, which is the recommended technique when a native
 * timingSafeEqual is unavailable. On Cloudflare Workers, crypto.subtle HMAC
 * is async, so we provide both sync (XOR fallback) and async (HMAC) variants.
 */

/**
 * Constant-time comparison using XOR (synchronous, no Web Crypto needed).
 * Safe for equal-length secret comparison. If lengths differ, the result is
 * false but the loop still runs over the longer input to avoid leaking length
 * via timing.
 */
export function timingSafeEqualSync(a: string, b: string): boolean {
	const enc = new TextEncoder();
	const bufA = enc.encode(a);
	const bufB = enc.encode(b);

	// Compare over the max length to avoid length-based timing leak.
	const maxLen = Math.max(bufA.length, bufB.length);
	let result = bufA.length === bufB.length ? 1 : 0;

	for (let i = 0; i < maxLen; i++) {
		const byteA = i < bufA.length ? bufA[i]! : 0;
		const byteB = i < bufB.length ? bufB[i]! : 0;
		// XOR accumulates differences; result stays 1 only if all bytes match.
		result &= byteA === byteB ? 1 : 0;
	}

	return result === 1;
}

/**
 * Constant-time comparison using double-HMAC (asynchronous, cryptographically
 * stronger). Preferred for long-lived secrets like API keys and webhook tokens.
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
	// Fast path: if lengths differ, still do the work to avoid timing leak,
	// but we know the answer is false.
	const key = crypto.getRandomValues(new Uint8Array(32));

	const [hmacA, hmacB] = await Promise.all([
		hmacSha256(key, a),
		hmacSha256(key, b),
	]);

	return timingSafeEqualSync(hmacA, hmacB);
}

async function hmacSha256(key: Uint8Array, message: string): Promise<string> {
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		key,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
	return bufToHex(sig);
}

function bufToHex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}
