/**
 * CSV Export Utility
 * Handles conversion of data arrays to CSV format
 */

export interface CsvColumn<T> {
	header: string;
	key: keyof T;
	format?: (value: T[keyof T]) => string;
}

/**
 * Escape a field for CSV output
 */
function escapeField(value: unknown): string {
	if (value === null || value === undefined) {
		return '';
	}

	const str = String(value);

	// If contains comma, quote, or newline, wrap in quotes
	if (str.includes(',') || str.includes('"') || str.includes('\n')) {
		return `"${str.replace(/"/g, '""')}"`;
	}

	return str;
}

/**
 * Format a number as currency (IDR)
 */
export function formatCurrency(value: unknown): string {
	if (value === null || value === undefined) return '';
	const num = Number(value);
	if (isNaN(num)) return '';
	return String(Math.round(num));
}

/**
 * Format a percentage
 */
export function formatPercentage(value: unknown): string {
	if (value === null || value === undefined) return '';
	const num = Number(value);
	if (isNaN(num)) return '';
	return `${num.toFixed(2)}%`;
}

/**
 * Format a date for CSV
 */
export function formatDate(value: unknown): string {
	if (!value) return '';
	return String(value).split('T')[0]; // Just the date part
}

/**
 * Generate CSV content from data array
 */
export function generateCsv<T extends Record<string, unknown>>(
	data: T[],
	columns: CsvColumn<T>[]
): string {
	// Generate header row
	const headerRow = columns.map((col) => escapeField(col.header)).join(',');

	// Generate data rows
	const dataRows = data.map((item) =>
		columns
			.map((col) => {
				const value = item[col.key];
				if (col.format) {
					return escapeField(col.format(value));
				}
				return escapeField(value);
			})
			.join(',')
	);

	// Combine with newlines
	return [headerRow, ...dataRows].join('\n');
}

/**
 * Generate a filename for CSV download
 */
export function generateCsvFilename(reportType: string, startDate?: string, endDate?: string): string {
	const dateRange = startDate && endDate ? `${startDate}_to_${endDate}` : new Date().toISOString().split('T')[0];
	return `${reportType}_${dateRange}.csv`;
}

/**
 * Create CSV response headers for Hono
 */
export function getCsvResponseHeaders(filename: string): Record<string, string> {
	return {
		'Content-Type': 'text/csv; charset=utf-8',
		'Content-Disposition': `attachment; filename="${filename}"`,
		'Cache-Control': 'no-cache',
	};
}
