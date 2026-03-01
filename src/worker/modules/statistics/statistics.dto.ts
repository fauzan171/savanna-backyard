/**
 * Statistics module DTOs (Zod validation schemas)
 */
import { z } from 'zod';

// Date range query schema
export const dateRangeQuerySchema = z.object({
	startDate: z.string().date().optional(),
	endDate: z.string().date().optional(),
});

export type DateRangeQueryDto = z.infer<typeof dateRangeQuerySchema>;

// Period filter schema (for overview endpoint)
export const periodFilterSchema = z.object({
	period: z.enum(['today', 'week', 'month', 'year']).optional().default('today'),
});

export type PeriodFilterDto = z.infer<typeof periodFilterSchema>;

// Revenue stats query schema
export const revenueQuerySchema = dateRangeQuerySchema.extend({
	groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});

export type RevenueQueryDto = z.infer<typeof revenueQuerySchema>;

// Report query schema (with format option)
export const reportQuerySchema = dateRangeQuerySchema.extend({
	groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
	format: z.enum(['json', 'csv']).optional().default('json'),
});

export type ReportQueryDto = z.infer<typeof reportQuerySchema>;

// Revenue report query schema
export const revenueReportQuerySchema = reportQuerySchema.extend({
	vehicleType: z.string().optional(),
});

export type RevenueReportQueryDto = z.infer<typeof revenueReportQuerySchema>;

// Fleet utilization report query schema
export const fleetReportQuerySchema = reportQuerySchema.extend({
	vehicleId: z.string().optional(),
});

export type FleetReportQueryDto = z.infer<typeof fleetReportQuerySchema>;

// Dashboard query schema (combined)
export const dashboardQuerySchema = dateRangeQuerySchema;

export type DashboardQueryDto = z.infer<typeof dashboardQuerySchema>;
