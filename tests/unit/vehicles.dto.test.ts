import { describe, it, expect } from 'vitest';
import { createVehicleSchema, updateVehicleSchema } from '@/worker/modules/vehicles/vehicles.dto';

const valid = {
	name: 'Honda CRF',
	plateNumber: 'B 1234 SVK',
	type: 'TrailBike' as const,
	dailyRateIdr: 250000,
};

describe('Vehicle DTO rate bounds (VEH-04 / VEH-08)', () => {
	it('rejects dailyRateIdr = 0', () => {
		const r = createVehicleSchema.safeParse({ ...valid, dailyRateIdr: 0 });
		expect(r.success).toBe(false);
	});

	it('rejects dailyRateIdr above 10.000.000', () => {
		const r = createVehicleSchema.safeParse({ ...valid, dailyRateIdr: 999999999 });
		expect(r.success).toBe(false);
	});

	it('accepts dailyRateIdr within range', () => {
		const r = createVehicleSchema.safeParse({ ...valid, dailyRateIdr: 10000000 });
		expect(r.success).toBe(true);
	});

	it('update schema also caps dailyRateIdr', () => {
		expect(updateVehicleSchema.safeParse({ dailyRateIdr: 0 }).success).toBe(false);
		expect(updateVehicleSchema.safeParse({ dailyRateIdr: 99999999 }).success).toBe(false);
	});
});
