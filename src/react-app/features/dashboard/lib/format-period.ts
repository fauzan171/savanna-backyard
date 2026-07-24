import type { Period } from '../types/dashboard.types';

/**
 * Formats a dashboard `period` value into a human-readable label.
 *
 * DASH-01 fix: the backend returns `period` inconsistently — some endpoints
 * return a plain string ('today', 'month'), others return an object
 * { start, end }. Previously this was interpolated via `${data.period}`,
 * which rendered '[object Object]'. This helper normalizes all shapes.
 */
export function formatPeriodLabel(period: Period): string {
	// Plain string (e.g. 'today', 'week', 'month', 'year')
	if (typeof period === 'string') {
		return period;
	}

	// Object with a pre-formatted label
	if (period && typeof period === 'object' && 'label' in period && period.label) {
		return period.label;
	}

	// Object with { start, end } date range
	if (
		period &&
		typeof period === 'object' &&
		'start' in period &&
		'end' in period &&
		period.start &&
		period.end
	) {
		const fmt = (d: string) => {
			try {
				return new Date(d).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
				});
			} catch {
				return String(d);
			}
		};
		return `${fmt(period.start)} → ${fmt(period.end)}`;
	}

	// Fallback: stringify safely (never '[object Object]')
	return JSON.stringify(period);
}
