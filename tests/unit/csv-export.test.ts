/**
 * Tests for CSV Export Utility
 */
import { describe, it, expect } from 'vitest';
import { generateCsv, generateCsvFilename, getCsvResponseHeaders, formatCurrency, formatPercentage, formatDate } from '@/worker/core/lib/csv-export';

describe('CSV Export Utility', () => {
	describe('escapeField', () => {
		it('should handle simple values', () => {
			const data = [{ name: 'John', age: 30 }];
			const columns = [
				{ header: 'Name', key: 'name' as const },
				{ header: 'Age', key: 'age' as const },
			];
			const csv = generateCsv(data, columns);
			expect(csv).toBe('Name,Age\nJohn,30');
		});

		it('should escape commas', () => {
			const data = [{ name: 'John, Doe', age: 30 }];
			const columns = [
				{ header: 'Name', key: 'name' as const },
				{ header: 'Age', key: 'age' as const },
			];
			const csv = generateCsv(data, columns);
			expect(csv).toBe('Name,Age\n"John, Doe",30');
		});

		it('should escape quotes', () => {
			const data = [{ name: 'John "The Rock" Doe', age: 30 }];
			const columns = [
				{ header: 'Name', key: 'name' as const },
				{ header: 'Age', key: 'age' as const },
			];
			const csv = generateCsv(data, columns);
			expect(csv).toBe('Name,Age\n"John ""The Rock"" Doe",30');
		});

		it('should handle null values', () => {
			const data = [{ name: null, age: 30 }];
			const columns = [
				{ header: 'Name', key: 'name' as const },
				{ header: 'Age', key: 'age' as const },
			];
			const csv = generateCsv(data, columns);
			expect(csv).toBe('Name,Age\n,30');
		});

		it('should handle undefined values', () => {
			const data = [{ name: undefined, age: 30 }];
			const columns = [
				{ header: 'Name', key: 'name' as const },
				{ header: 'Age', key: 'age' as const },
			];
			const csv = generateCsv(data, columns);
			expect(csv).toBe('Name,Age\n,30');
		});
	});

	describe('formatCurrency', () => {
		it('should format numbers', () => {
			expect(formatCurrency(1000000)).toBe('1000000');
			expect(formatCurrency(0)).toBe('0');
		});

		it('should handle null', () => {
			expect(formatCurrency(null)).toBe('');
		});

		it('should handle undefined', () => {
			expect(formatCurrency(undefined)).toBe('');
		});
	});

	describe('formatPercentage', () => {
		it('should format percentages', () => {
			expect(formatPercentage(50)).toBe('50.00%');
			expect(formatPercentage(33.333)).toBe('33.33%');
		});

		it('should handle null', () => {
			expect(formatPercentage(null)).toBe('');
		});
	});

	describe('formatDate', () => {
		it('should format dates', () => {
			expect(formatDate('2026-02-15T10:30:00Z')).toBe('2026-02-15');
		});

		it('should handle null', () => {
			expect(formatDate(null)).toBe('');
		});
	});

	describe('generateCsvFilename', () => {
		it('should generate filename with date range', () => {
			const filename = generateCsvFilename('revenue', '2026-01-01', '2026-01-31');
			expect(filename).toBe('revenue_2026-01-01_to_2026-01-31.csv');
		});

		it('should generate filename with current date when no range', () => {
			const filename = generateCsvFilename('revenue');
			expect(filename).toMatch(/revenue_\d{4}-\d{2}-\d{2}\.csv/);
		});
	});

	describe('getCsvResponseHeaders', () => {
		it('should return correct headers', () => {
			const headers = getCsvResponseHeaders('test.csv');
			expect(headers['Content-Type']).toBe('text/csv; charset=utf-8');
			expect(headers['Content-Disposition']).toBe('attachment; filename="test.csv"');
			expect(headers['Cache-Control']).toBe('no-cache');
		});
	});
});
