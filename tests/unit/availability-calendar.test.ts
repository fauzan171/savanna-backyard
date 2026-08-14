import { describe, expect, it } from 'vitest';
import type { DateRange } from 'react-day-picker';
import { isRangeSelectable } from '@/react-app/components/data-display/availability-calendar';

describe('isRangeSelectable (RENT-02)', () => {
	const blockedDates = [
		new Date('2026-07-20T00:00:00.000Z'),
		new Date('2026-07-22T00:00:00.000Z'),
	];

	it('rejects a single blocked day', () => {
		const range: DateRange = {
			from: new Date('2026-07-20T00:00:00.000Z'),
			to: new Date('2026-07-20T00:00:00.000Z'),
		};

		expect(isRangeSelectable(range, blockedDates)).toBe(false);
	});

	it('rejects a range that overlaps a blocked day', () => {
		const range: DateRange = {
			from: new Date('2026-07-19T00:00:00.000Z'),
			to: new Date('2026-07-21T00:00:00.000Z'),
		};

		expect(isRangeSelectable(range, blockedDates)).toBe(false);
	});

	it('accepts a range that avoids blocked days', () => {
		const range: DateRange = {
			from: new Date('2026-07-23T00:00:00.000Z'),
			to: new Date('2026-07-24T00:00:00.000Z'),
		};

		expect(isRangeSelectable(range, blockedDates)).toBe(true);
	});

	it('rejects days before the minimum date', () => {
		const range: DateRange = {
			from: new Date('2026-07-18T00:00:00.000Z'),
			to: new Date('2026-07-19T00:00:00.000Z'),
		};

		expect(isRangeSelectable(range, [], new Date('2026-07-19T00:00:00.000Z'))).toBe(false);
	});
});
