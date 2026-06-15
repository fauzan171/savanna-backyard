/**
 * Statistics Repository
 * Handles all SQL aggregation queries for dashboard and reports
 */
import { and, eq, gte, lte, count, sum, sql, desc, asc, isNotNull, inArray } from 'drizzle-orm';
import {
	bookings,
	payments,
	leads,
	vehicles,
	customers,
	maintenanceRecords,
} from '@/worker/core/database/schema';
import type { Database } from '@/worker/core/database';

export class StatisticsRepository {
	constructor(private db: Database) {}

	// ============ Revenue Queries ============

	/**
	 * Get total revenue from completed bookings within date range
	 */
	async getTotalRevenue(startDate?: string, endDate?: string): Promise<number> {
		const conditions = [inArray(bookings.status, ['Confirmed', 'Active', 'Completed'])];
		if (startDate) conditions.push(gte(bookings.startDate, startDate));
		if (endDate) conditions.push(lte(bookings.endDate, endDate));

		const result = await this.db
			.select({ total: sum(bookings.totalAmount) })
			.from(bookings)
			.where(and(...conditions));

		return Number(result[0]?.total ?? 0);
	}

	/**
	 * Get revenue breakdown by date (day, week, or month)
	 */
	async getRevenueByDate(
		startDate: string,
		endDate: string,
		groupBy: 'day' | 'week' | 'month' = 'day'
	): Promise<Array<{ date: string; revenue: number; bookings: number }>> {
		const dateFormat = {
			day: '%Y-%m-%d',
			week: '%Y-W%W',
			month: '%Y-%m',
		}[groupBy];

		const result = await this.db
			.select({
				date: sql<string>`strftime('${sql.raw(dateFormat)}', ${bookings.startDate})`,
				revenue: sum(bookings.totalAmount),
				bookings: count(),
			})
			.from(bookings)
			.where(
				and(
					inArray(bookings.status, ['Confirmed', 'Active', 'Completed']),
					gte(bookings.startDate, startDate),
					lte(bookings.endDate, endDate)
				)
			)
			.groupBy(sql`strftime('${sql.raw(dateFormat)}', ${bookings.startDate})`)
			.orderBy(asc(sql`strftime('${sql.raw(dateFormat)}', ${bookings.startDate})`));

		return result.map((r) => ({
			date: r.date,
			revenue: Number(r.revenue ?? 0),
			bookings: Number(r.bookings),
		}));
	}

	/**
	 * Get revenue by vehicle type
	 */
	async getRevenueByVehicleType(
		startDate?: string,
		endDate?: string
	): Promise<Array<{ type: string; revenue: number; bookings: number; percentage: number }>> {
		const conditions = [inArray(bookings.status, ['Confirmed', 'Active', 'Completed'])];
		if (startDate) conditions.push(gte(bookings.startDate, startDate));
		if (endDate) conditions.push(lte(bookings.endDate, endDate));

		const result = await this.db
			.select({
				type: vehicles.type,
				revenue: sum(bookings.totalAmount),
				bookings: count(),
			})
			.from(bookings)
			.innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
			.where(and(...conditions))
			.groupBy(vehicles.type)
			.orderBy(desc(sum(bookings.totalAmount)));

		const totalRevenue = result.reduce((acc, r) => acc + Number(r.revenue ?? 0), 0);

		return result.map((r) => ({
			type: r.type,
			revenue: Number(r.revenue ?? 0),
			bookings: Number(r.bookings),
			percentage: totalRevenue > 0 ? Math.round((Number(r.revenue ?? 0) / totalRevenue) * 10000) / 100 : 0,
		}));
	}

	/**
	 * Get revenue by payment method
	 */
	async getRevenueByPaymentMethod(
		startDate?: string,
		endDate?: string
	): Promise<Array<{ method: string; amount: number; count: number }>> {
		const conditions = [eq(payments.status, 'Verified')];
		if (startDate) conditions.push(gte(payments.createdAt, startDate));
		if (endDate) conditions.push(lte(payments.createdAt, `${endDate}T23:59:59`));

		const result = await this.db
			.select({
				method: payments.method,
				amount: sum(payments.amount),
				count: count(),
			})
			.from(payments)
			.where(and(...conditions))
			.groupBy(payments.method)
			.orderBy(desc(sum(payments.amount)));

		return result.map((r) => ({
			method: r.method,
			amount: Number(r.amount ?? 0),
			count: Number(r.count),
		}));
	}

	// ============ Booking Queries ============

	/**
	 * Get booking counts by status
	 */
	async getBookingCountsByStatus(
		startDate?: string,
		endDate?: string
	): Promise<{ total: number; byStatus: Record<string, number> }> {
		const conditions = [];
		if (startDate) conditions.push(gte(bookings.startDate, startDate));
		if (endDate) conditions.push(lte(bookings.endDate, endDate));

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const result = await this.db
			.select({
				status: bookings.status,
				count: count(),
			})
			.from(bookings)
			.where(whereClause)
			.groupBy(bookings.status);

		const byStatus: Record<string, number> = {
			Pending: 0,
			Confirmed: 0,
			Active: 0,
			Completed: 0,
			Cancelled: 0,
		};

		let total = 0;
		for (const r of result) {
			byStatus[r.status] = Number(r.count);
			total += Number(r.count);
		}

		return { total, byStatus };
	}

	/**
	 * Get active bookings count
	 */
	async getActiveBookingsCount(): Promise<number> {
		const result = await this.db
			.select({ count: count() })
			.from(bookings)
			.where(eq(bookings.status, 'Active'));

		return Number(result[0]?.count ?? 0);
	}

	/**
	 * Get today's pickups (bookings starting today)
	 */
	async getTodayPickups(): Promise<
		Array<{
			bookingId: string;
			bookingNumber: string;
			customerName: string;
			customerPhone: string;
			vehicleName: string;
			startDate: string;
		}>
	> {
		const today = new Date().toISOString().split('T')[0];

		const result = await this.db
			.select({
				bookingId: bookings.id,
				bookingNumber: bookings.bookingNumber,
				customerName: customers.name,
				customerPhone: customers.phone,
				vehicleName: vehicles.name,
				startDate: bookings.startDate,
			})
			.from(bookings)
			.innerJoin(customers, eq(bookings.customerId, customers.id))
			.innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
			.where(and(eq(bookings.startDate, today), inArray(bookings.status, ['Confirmed', 'Active'])))
			.orderBy(asc(bookings.startDate));

		return result;
	}

	/**
	 * Get today's returns (bookings ending today)
	 */
	async getTodayReturns(): Promise<
		Array<{
			bookingId: string;
			bookingNumber: string;
			customerName: string;
			customerPhone: string;
			vehicleName: string;
			endDate: string;
			status: string;
		}>
	> {
		const today = new Date().toISOString().split('T')[0];

		const result = await this.db
			.select({
				bookingId: bookings.id,
				bookingNumber: bookings.bookingNumber,
				customerName: customers.name,
				customerPhone: customers.phone,
				vehicleName: vehicles.name,
				endDate: bookings.endDate,
				status: bookings.status,
			})
			.from(bookings)
			.innerJoin(customers, eq(bookings.customerId, customers.id))
			.innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
			.where(and(eq(bookings.endDate, today), eq(bookings.status, 'Active')))
			.orderBy(asc(bookings.endDate));

		return result;
	}

	// ============ Lead Queries ============

	/**
	 * Get lead counts by status
	 */
	async getLeadCountsByStatus(
		startDate?: string,
		endDate?: string
	): Promise<{ total: number; byStatus: Record<string, number>; converted: number }> {
		const conditions = [];
		if (startDate) conditions.push(gte(leads.createdAt, startDate));
		if (endDate) conditions.push(lte(leads.createdAt, `${endDate}T23:59:59`));

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const result = await this.db
			.select({
				status: leads.status,
				count: count(),
			})
			.from(leads)
			.where(whereClause)
			.groupBy(leads.status);

		const byStatus: Record<string, number> = {
			New: 0,
			Contacted: 0,
			Negotiating: 0,
			Converted: 0,
			Lost: 0,
		};

		let total = 0;
		let converted = 0;
		for (const r of result) {
			byStatus[r.status] = Number(r.count);
			total += Number(r.count);
			if (r.status === 'Converted') converted = Number(r.count);
		}

		return { total, byStatus, converted };
	}

	/**
	 * Get lead stats by source
	 */
	async getLeadsBySource(
		startDate?: string,
		endDate?: string
	): Promise<Array<{ source: string; count: number; converted: number; conversionRate: number }>> {
		const conditions = [];
		if (startDate) conditions.push(gte(leads.createdAt, startDate));
		if (endDate) conditions.push(lte(leads.createdAt, `${endDate}T23:59:59`));

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const result = await this.db
			.select({
				source: leads.source,
				status: leads.status,
				count: count(),
			})
			.from(leads)
			.where(whereClause)
			.groupBy(leads.source, leads.status);

		// Aggregate by source
		const bySource: Record<string, { total: number; converted: number }> = {};
		for (const r of result) {
			if (!bySource[r.source]) {
				bySource[r.source] = { total: 0, converted: 0 };
			}
			bySource[r.source].total += Number(r.count);
			if (r.status === 'Converted') {
				bySource[r.source].converted += Number(r.count);
			}
		}

		return Object.entries(bySource).map(([source, data]) => ({
			source,
			count: data.total,
			converted: data.converted,
			conversionRate: data.total > 0 ? Math.round((data.converted / data.total) * 10000) / 100 : 0,
		}));
	}

	/**
	 * Get lead stats by priority
	 */
	async getLeadsByPriority(
		startDate?: string,
		endDate?: string
	): Promise<Record<string, number>> {
		const conditions = [];
		if (startDate) conditions.push(gte(leads.createdAt, startDate));
		if (endDate) conditions.push(lte(leads.createdAt, `${endDate}T23:59:59`));

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const result = await this.db
			.select({
				priority: leads.priority,
				count: count(),
			})
			.from(leads)
			.where(whereClause)
			.groupBy(leads.priority);

		const byPriority: Record<string, number> = {
			Hot: 0,
			Warm: 0,
			Cold: 0,
		};

		for (const r of result) {
			byPriority[r.priority] = Number(r.count);
		}

		return byPriority;
	}

	/**
	 * Get follow-up reminders due
	 */
	async getFollowUpReminders(): Promise<
		Array<{
			leadId: string;
			customerName: string;
			phone: string;
			priority: string;
			followUpDate: string | null;
		}>
	> {
		const today = new Date().toISOString().split('T')[0];

		const result = await this.db
			.select({
				leadId: leads.id,
				customerName: leads.name,
				phone: leads.phone,
				priority: leads.priority,
				followUpDate: leads.followUpDate,
			})
			.from(leads)
			.where(
				and(
					isNotNull(leads.followUpDate),
					lte(leads.followUpDate, today),
					inArray(leads.status, ['New', 'Contacted', 'Negotiating'])
				)
			)
			.orderBy(asc(leads.followUpDate));

		return result;
	}

	// ============ Vehicle/Fleet Queries ============

	/**
	 * Get vehicle counts by status
	 */
	async getVehicleCountsByStatus(): Promise<{ total: number; byStatus: Record<string, number> }> {
		const result = await this.db
			.select({
				status: vehicles.status,
				count: count(),
			})
			.from(vehicles)
			.groupBy(vehicles.status);

		const byStatus: Record<string, number> = {
			Available: 0,
			Rented: 0,
			Maintenance: 0,
			Inactive: 0,
		};

		let total = 0;
		for (const r of result) {
			byStatus[r.status] = Number(r.count);
			total += Number(r.count);
		}

		return { total, byStatus };
	}

	/**
	 * Get vehicle counts by type
	 */
	async getVehiclesByType(): Promise<Array<{ type: string; total: number; rented: number }>> {
		const allVehicles = await this.db
			.select({
				type: vehicles.type,
				status: vehicles.status,
			})
			.from(vehicles);

		const byType: Record<string, { total: number; rented: number }> = {};
		for (const v of allVehicles) {
			if (!byType[v.type]) {
				byType[v.type] = { total: 0, rented: 0 };
			}
			byType[v.type].total++;
			if (v.status === 'Rented') {
				byType[v.type].rented++;
			}
		}

		return Object.entries(byType).map(([type, data]) => ({
			type,
			total: data.total,
			rented: data.rented,
		}));
	}

	/**
	 * Get top rented vehicles
	 */
	async getTopVehicles(
		startDate?: string,
		endDate?: string,
		limit = 5
	): Promise<
		Array<{
			id: string;
			name: string;
			rentalDays: number;
			revenue: number;
		}>
	> {
		const conditions = [inArray(bookings.status, ['Confirmed', 'Active', 'Completed'])];
		if (startDate) conditions.push(gte(bookings.startDate, startDate));
		if (endDate) conditions.push(lte(bookings.endDate, endDate));

		const result = await this.db
			.select({
				id: vehicles.id,
				name: vehicles.name,
				rentalDays: sql<number>`SUM(julianday(${bookings.endDate}) - julianday(${bookings.startDate}) + 1)`,
				revenue: sum(bookings.totalAmount),
			})
			.from(bookings)
			.innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
			.where(and(...conditions))
			.groupBy(vehicles.id, vehicles.name)
			.orderBy(desc(sum(bookings.totalAmount)))
			.limit(limit);

		return result.map((r) => ({
			id: r.id,
			name: r.name,
			rentalDays: Math.round(Number(r.rentalDays) ?? 0),
			revenue: Number(r.revenue ?? 0),
		}));
	}

	/**
	 * Get maintenance alerts (vehicles needing maintenance)
	 */
	async getMaintenanceAlerts(): Promise<
		Array<{
			id: string;
			name: string;
			lastMaintenance: string | null;
			daysSinceMaintenance: number;
			status: string;
		}>
	> {
		const today = new Date().toISOString().split('T')[0];

		// Get vehicles with their last maintenance date
		const vehicleList = await this.db.select().from(vehicles);

		const results = [];
		for (const vehicle of vehicleList) {
			const lastMaintenance = await this.db
				.select({ endDate: maintenanceRecords.endDate })
				.from(maintenanceRecords)
				.where(
					and(eq(maintenanceRecords.vehicleId, vehicle.id), eq(maintenanceRecords.status, 'Completed'))
				)
				.orderBy(desc(maintenanceRecords.endDate))
				.limit(1);

			const lastDate = lastMaintenance[0]?.endDate ?? null;
			let daysSince = 999;
			if (lastDate) {
				const diff = new Date(today).getTime() - new Date(lastDate).getTime();
				daysSince = Math.floor(diff / (1000 * 60 * 60 * 24));
			}

			// Alert if > 30 days since maintenance
			if (daysSince > 30) {
				results.push({
					id: vehicle.id,
					name: vehicle.name,
					lastMaintenance: lastDate,
					daysSinceMaintenance: daysSince,
					status: daysSince > 60 ? 'overdue' : 'warning',
				});
			}
		}

		return results.sort((a, b) => b.daysSinceMaintenance - a.daysSinceMaintenance);
	}

	// ============ Payment Queries ============

	/**
	 * Get payment amounts by status
	 */
	async getPaymentAmountsByStatus(
		startDate?: string,
		endDate?: string
	): Promise<{ byStatus: Record<string, number>; totalReceived: number; totalPending: number }> {
		const conditions = [];
		if (startDate) conditions.push(gte(payments.createdAt, startDate));
		if (endDate) conditions.push(lte(payments.createdAt, `${endDate}T23:59:59`));

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const result = await this.db
			.select({
				status: payments.status,
				amount: sum(payments.amount),
			})
			.from(payments)
			.where(whereClause)
			.groupBy(payments.status);

		const byStatus: Record<string, number> = {
			Verified: 0,
			Pending: 0,
			Failed: 0,
		};

		let totalReceived = 0;
		let totalPending = 0;
		for (const r of result) {
			byStatus[r.status] = Number(r.amount ?? 0);
			if (r.status === 'Verified') totalReceived = Number(r.amount ?? 0);
			if (r.status === 'Pending') totalPending = Number(r.amount ?? 0);
		}

		return { byStatus, totalReceived, totalPending };
	}

	/**
	 * Get payment amounts by method
	 */
	async getPaymentsByMethod(
		startDate?: string,
		endDate?: string
	): Promise<Record<string, number>> {
		const conditions = [eq(payments.status, 'Verified')];
		if (startDate) conditions.push(gte(payments.createdAt, startDate));
		if (endDate) conditions.push(lte(payments.createdAt, `${endDate}T23:59:59`));

		const result = await this.db
			.select({
				method: payments.method,
				amount: sum(payments.amount),
			})
			.from(payments)
			.where(and(...conditions))
			.groupBy(payments.method);

		const byMethod: Record<string, number> = {
			QRIS: 0,
			Gateway: 0,
			BankTransfer: 0,
			Cash: 0,
		};

		for (const r of result) {
			byMethod[r.method] = Number(r.amount ?? 0);
		}

		return byMethod;
	}

	/**
	 * Get pending payments that are overdue
	 */
	async getOverduePayments(): Promise<
		Array<{
			id: string;
			bookingNumber: string;
			customerName: string;
			amount: number;
			createdAt: string;
		}>
	> {
		const result = await this.db
			.select({
				id: payments.id,
				bookingNumber: bookings.bookingNumber,
				customerName: customers.name,
				amount: payments.amount,
				createdAt: payments.createdAt,
			})
			.from(payments)
			.innerJoin(bookings, eq(payments.bookingId, bookings.id))
			.innerJoin(customers, eq(bookings.customerId, customers.id))
			.where(eq(payments.status, 'Pending'))
			.orderBy(asc(payments.createdAt));

		return result;
	}

	// ============ Customer Queries ============

	/**
	 * Get customer statistics
	 */
	async getCustomerStats(
		startDate?: string,
		endDate?: string
	): Promise<{ total: number; newCount: number; blacklisted: number }> {
		const totalResult = await this.db.select({ count: count() }).from(customers);

		const newConditions = [];
		if (startDate) newConditions.push(gte(customers.createdAt, startDate));
		if (endDate) newConditions.push(lte(customers.createdAt, `${endDate}T23:59:59`));
		const newWhereClause = newConditions.length > 0 ? and(...newConditions) : undefined;

		const newResult = await this.db.select({ count: count() }).from(customers).where(newWhereClause);

		const blacklistedResult = await this.db
			.select({ count: count() })
			.from(customers)
			.where(eq(customers.isBlacklisted, true));

		return {
			total: Number(totalResult[0]?.count ?? 0),
			newCount: Number(newResult[0]?.count ?? 0),
			blacklisted: Number(blacklistedResult[0]?.count ?? 0),
		};
	}

	/**
	 * Get top customers by total spent
	 */
	async getTopCustomers(
		startDate?: string,
		endDate?: string,
		limit = 10
	): Promise<
		Array<{
			customerId: string;
			name: string;
			totalBookings: number;
			totalSpent: number;
			lastBooking: string;
		}>
	> {
		const conditions = [inArray(bookings.status, ['Confirmed', 'Active', 'Completed'])];
		if (startDate) conditions.push(gte(bookings.startDate, startDate));
		if (endDate) conditions.push(lte(bookings.endDate, endDate));

		const result = await this.db
			.select({
				customerId: customers.id,
				name: customers.name,
				totalBookings: count(),
				totalSpent: sum(bookings.totalAmount),
				lastBooking: sql<string>`MAX(${bookings.startDate})`,
			})
			.from(bookings)
			.innerJoin(customers, eq(bookings.customerId, customers.id))
			.where(and(...conditions))
			.groupBy(customers.id, customers.name)
			.orderBy(desc(sum(bookings.totalAmount)))
			.limit(limit);

		return result.map((r) => ({
			customerId: r.customerId,
			name: r.name,
			totalBookings: Number(r.totalBookings),
			totalSpent: Number(r.totalSpent ?? 0),
			lastBooking: r.lastBooking,
		}));
	}

	/**
	 * Get customers grouped by booking count
	 */
	async getCustomersByBookingCount(): Promise<Array<{ bookingCount: string; customerCount: number }>> {
		const result = await this.db
			.select({
				customerId: bookings.customerId,
				bookingCount: count(),
			})
			.from(bookings)
			.where(inArray(bookings.status, ['Confirmed', 'Active', 'Completed']))
			.groupBy(bookings.customerId);

		const groups: Record<string, number> = {
			'1': 0,
			'2-3': 0,
			'4+': 0,
		};

		for (const r of result) {
			const count = Number(r.bookingCount);
			if (count === 1) groups['1']++;
			else if (count <= 3) groups['2-3']++;
			else groups['4+']++;
		}

		return Object.entries(groups).map(([bookingCount, customerCount]) => ({
			bookingCount,
			customerCount,
		}));
	}

	// ============ Fleet Utilization Queries ============

	/**
	 * Get fleet utilization report data
	 */
	async getFleetUtilization(
		startDate: string,
		endDate: string
	): Promise<{
		totalRentalDays: number;
		byVehicle: Array<{
			vehicleId: string;
			vehicleName: string;
			plateNumber: string;
			type: string;
			rentalDays: number;
			revenue: number;
		}>;
	}> {
		const result = await this.db
			.select({
				vehicleId: vehicles.id,
				vehicleName: vehicles.name,
				plateNumber: vehicles.plateNumber,
				type: vehicles.type,
				rentalDays:
					sql<number>`SUM(CASE WHEN ${bookings.status} IN ('Confirmed', 'Active', 'Completed') THEN MAX(0, CAST(julianday(MIN(${bookings.endDate}, '${sql.raw(endDate)}')) AS REAL) - CAST(julianday(MAX(${bookings.startDate}, '${sql.raw(startDate)}')) AS REAL) + 1) ELSE 0 END)`,
				revenue: sum(bookings.totalAmount),
			})
			.from(vehicles)
			.leftJoin(bookings, eq(vehicles.id, bookings.vehicleId))
			.groupBy(vehicles.id, vehicles.name, vehicles.plateNumber, vehicles.type);

		let totalRentalDays = 0;
		const byVehicle = result.map((r) => {
			const days = Math.max(0, Math.round(Number(r.rentalDays) ?? 0));
			totalRentalDays += days;
			return {
				vehicleId: r.vehicleId,
				vehicleName: r.vehicleName,
				plateNumber: r.plateNumber,
				type: r.type,
				rentalDays: days,
				revenue: Number(r.revenue ?? 0),
			};
		});

		return { totalRentalDays, byVehicle };
	}

	/**
	 * Get maintenance days per vehicle within a date range
	 */
	async getMaintenanceDaysByVehicle(
		startDate: string,
		endDate: string
	): Promise<Record<string, number>> {
		// Calculate maintenance days per vehicle, clamped to the report date range
		const result = await this.db
			.select({
				vehicleId: maintenanceRecords.vehicleId,
				maintenanceDays: sql<number>`SUM(
					MAX(0,
						CAST(julianday(MIN(${maintenanceRecords.endDate}, '${sql.raw(endDate)}')) AS REAL) -
						CAST(julianday(MAX(${maintenanceRecords.startDate}, '${sql.raw(startDate)}')) AS REAL) + 1
					)
				)`,
			})
			.from(maintenanceRecords)
			.where(
				and(
					lte(maintenanceRecords.startDate, endDate),
					gte(maintenanceRecords.endDate, startDate)
				)
			)
			.groupBy(maintenanceRecords.vehicleId);

		const byVehicle: Record<string, number> = {};
		for (const r of result) {
			byVehicle[r.vehicleId] = Math.max(0, Math.round(Number(r.maintenanceDays) ?? 0));
		}
		return byVehicle;
	}

	/**
	 * Get leads grouped by source with detailed status breakdown
	 */
	async getLeadsBySourceDetailed(
		startDate?: string,
		endDate?: string
	): Promise<Array<{ source: string; total: number; converted: number; lost: number; inProgress: number; conversionRate: number }>> {
		const conditions = [];
		if (startDate) conditions.push(gte(leads.createdAt, startDate));
		if (endDate) conditions.push(lte(leads.createdAt, `${endDate}T23:59:59`));

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const result = await this.db
			.select({
				source: leads.source,
				status: leads.status,
				count: count(),
			})
			.from(leads)
			.where(whereClause)
			.groupBy(leads.source, leads.status);

		const bySource: Record<string, { total: number; converted: number; lost: number; inProgress: number }> = {};
		for (const r of result) {
			if (!bySource[r.source]) {
				bySource[r.source] = { total: 0, converted: 0, lost: 0, inProgress: 0 };
			}
			bySource[r.source].total += Number(r.count);
			if (r.status === 'Converted') {
				bySource[r.source].converted += Number(r.count);
			} else if (r.status === 'Lost') {
				bySource[r.source].lost += Number(r.count);
			} else if (['New', 'Contacted', 'Negotiating'].includes(r.status)) {
				bySource[r.source].inProgress += Number(r.count);
			}
		}

		return Object.entries(bySource).map(([source, data]) => ({
			source,
			total: data.total,
			converted: data.converted,
			lost: data.lost,
			inProgress: data.inProgress,
			conversionRate: data.total > 0 ? Math.round((data.converted / data.total) * 10000) / 100 : 0,
		}));
	}

	/**
	 * Get leads grouped by priority with converted counts
	 */
	async getLeadsByPriorityDetailed(
		startDate?: string,
		endDate?: string
	): Promise<Array<{ priority: string; total: number; converted: number; conversionRate: number }>> {
		const conditions = [];
		if (startDate) conditions.push(gte(leads.createdAt, startDate));
		if (endDate) conditions.push(lte(leads.createdAt, `${endDate}T23:59:59`));

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const result = await this.db
			.select({
				priority: leads.priority,
				status: leads.status,
				count: count(),
			})
			.from(leads)
			.where(whereClause)
			.groupBy(leads.priority, leads.status);

		const byPriority: Record<string, { total: number; converted: number }> = {};
		for (const r of result) {
			if (!byPriority[r.priority]) {
				byPriority[r.priority] = { total: 0, converted: 0 };
			}
			byPriority[r.priority].total += Number(r.count);
			if (r.status === 'Converted') {
				byPriority[r.priority].converted += Number(r.count);
			}
		}

		return Object.entries(byPriority).map(([priority, data]) => ({
			priority,
			total: data.total,
			converted: data.converted,
			conversionRate: data.total > 0 ? Math.round((data.converted / data.total) * 10000) / 100 : 0,
		}));
	}

	/**
	 * Get revenue from converted leads grouped by source
	 */
	async getRevenueByLeadSource(
		startDate?: string,
		endDate?: string
	): Promise<Record<string, number>> {
		const conditions = [
			eq(leads.status, 'Converted'),
			inArray(bookings.status, ['Confirmed', 'Active', 'Completed']),
		];
		if (startDate) conditions.push(gte(bookings.startDate, startDate));
		if (endDate) conditions.push(lte(bookings.endDate, endDate));

		const result = await this.db
			.select({
				source: leads.source,
				revenue: sum(bookings.totalAmount),
			})
			.from(leads)
			.innerJoin(customers, eq(leads.phone, customers.phone))
			.innerJoin(bookings, eq(customers.id, bookings.customerId))
			.where(and(...conditions))
			.groupBy(leads.source);

		const bySource: Record<string, number> = {};
		for (const r of result) {
			bySource[r.source] = Number(r.revenue ?? 0);
		}
		return bySource;
	}

	/**
	 * Get weekly lead trend (new leads and conversions per week)
	 */
	async getLeadWeeklyTrend(
		startDate?: string,
		endDate?: string
	): Promise<Array<{ week: string; newLeads: number; converted: number; conversionRate: number }>> {
		const conditions = [];
		if (startDate) conditions.push(gte(leads.createdAt, startDate));
		if (endDate) conditions.push(lte(leads.createdAt, `${endDate}T23:59:59`));

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const result = await this.db
			.select({
				week: sql<string>`strftime('%Y-W%W', ${leads.createdAt})`,
				status: leads.status,
				count: count(),
			})
			.from(leads)
			.where(whereClause)
			.groupBy(sql`strftime('%Y-W%W', ${leads.createdAt})`, leads.status)
			.orderBy(asc(sql`strftime('%Y-W%W', ${leads.createdAt})`));

		const byWeek: Record<string, { newLeads: number; converted: number }> = {};
		for (const r of result) {
			if (!byWeek[r.week]) {
				byWeek[r.week] = { newLeads: 0, converted: 0 };
			}
			byWeek[r.week].newLeads += Number(r.count);
			if (r.status === 'Converted') {
				byWeek[r.week].converted += Number(r.count);
			}
		}

		return Object.entries(byWeek).map(([week, data]) => ({
			week,
			newLeads: data.newLeads,
			converted: data.converted,
			conversionRate: data.newLeads > 0 ? Math.round((data.converted / data.newLeads) * 10000) / 100 : 0,
		}));
	}

	/**
	 * Get payment daily breakdown (received vs pending per day)
	 */
	async getPaymentDailyBreakdown(
		startDate: string,
		endDate: string
	): Promise<Array<{ date: string; received: number; pending: number }>> {
		const result = await this.db
			.select({
				date: sql<string>`strftime('%Y-%m-%d', ${payments.createdAt})`,
				status: payments.status,
				amount: sum(payments.amount),
			})
			.from(payments)
			.where(
				and(
					gte(payments.createdAt, startDate),
					lte(payments.createdAt, `${endDate}T23:59:59`)
				)
			)
			.groupBy(sql`strftime('%Y-%m-%d', ${payments.createdAt})`, payments.status)
			.orderBy(asc(sql`strftime('%Y-%m-%d', ${payments.createdAt})`));

		const byDate: Record<string, { received: number; pending: number }> = {};
		for (const r of result) {
			if (!byDate[r.date]) {
				byDate[r.date] = { received: 0, pending: 0 };
			}
			if (r.status === 'Verified') {
				byDate[r.date].received += Number(r.amount ?? 0);
			} else if (r.status === 'Pending') {
				byDate[r.date].pending += Number(r.amount ?? 0);
			}
		}

		return Object.entries(byDate).map(([date, data]) => ({
			date,
			received: data.received,
			pending: data.pending,
		}));
	}
}
