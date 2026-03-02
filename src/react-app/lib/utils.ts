import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Format a number as Indonesian Rupiah currency
 * @param value - The number to format
 * @param options - Optional formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
	value: number | undefined | null,
	options?: {
		currency?: 'IDR' | 'USD';
		notation?: 'standard' | 'compact';
	}
): string {
	if (value === undefined || value === null || isNaN(value)) {
		return '-';
	}

	const { currency = 'IDR', notation } = options ?? {};

	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
		notation: notation ?? (value >= 1000000 ? 'compact' : 'standard'),
	}).format(value);
}
