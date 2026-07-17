import { describe, it, expect } from 'vitest';
import { decodeVehicleQr } from '@/worker/core/lib/qr';

describe('decodeVehicleQr', () => {
	it('decodes the compact form SVN:{vehicleId}', () => {
		expect(decodeVehicleQr('SVN:abc-123')).toBe('abc-123');
	});

	it('decodes the compact+checksum form SVN:{vehicleId}:{checksum} (id is the first segment)', () => {
		expect(decodeVehicleQr('SVN:abc-123:deadbeef')).toBe('abc-123');
	});

	it('decodes the full URL form .../scan/{vehicleId}', () => {
		expect(decodeVehicleQr('https://savannabromo.com/scan/abc-123')).toBe('abc-123');
	});

	it('decodes a bare vehicleId', () => {
		expect(decodeVehicleQr('abc-123')).toBe('abc-123');
	});

	it('strips trailing query/hash debris', () => {
		expect(decodeVehicleQr('SVN:abc-123?foo=bar')).toBe('abc-123');
		expect(decodeVehicleQr('https://x.test/scan/abc-123#t')).toBe('abc-123');
	});

	it('returns null for empty / whitespace input', () => {
		expect(decodeVehicleQr('')).toBeNull();
		expect(decodeVehicleQr('   ')).toBeNull();
	});
});
