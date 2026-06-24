/**
 * QR code utilities for vehicle pickup/return scanning.
 *
 * QR content formats supported (the customer/admin scanners decode the same way):
 *   - `SVN:{vehicleId}`                 (compact, no checksum)
 *   - `SVN:{vehicleId}:{checksum}`      (compact with anti-tamper checksum)
 *   - `https://{host}/scan/{vehicleId}` (full URL form)
 *   - bare `{vehicleId}`
 *
 * The vehicle id is always the FIRST segment after any prefix — mirrors the
 * decode logic in the customer webapp (savana) ScanPage so both sides agree.
 */
export function decodeVehicleQr(raw: string): string | null {
	if (!raw) return null;

	let s = raw.trim();
	if (!s) return null;

	// URL form: take the segment after the last `/scan/`
	if (s.includes('/scan/')) {
		const parts = s.split('/scan/');
		s = parts[parts.length - 1]!;
	} else if (s.startsWith('SVN:')) {
		s = s.substring('SVN:'.length);
	}

	// Compact checksum form: `{id}:{checksum}` → id is the first segment
	if (s.includes(':')) {
		s = s.split(':')[0]!;
	}

	// Strip any trailing query/hash debris
	s = s.split('?')[0]!.split('#')[0]!;

	return s || null;
}
