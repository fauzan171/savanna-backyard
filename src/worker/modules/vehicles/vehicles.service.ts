import { VehiclesRepository } from "./vehicles.repository";
import { BookingsRepository } from "../bookings/bookings.repository";
import { MaintenanceRepository } from "../maintenance/maintenance.repository";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/worker/core/types/errors";
import type {
  VehicleResponse,
  VehicleWithDetails,
  AvailabilityResult,
  CalendarResult,
  CalendarMatrixResult,
  CalendarMatrixCell,
} from "./vehicles.types";
import type {
  CreateVehicleRequest,
  UpdateVehicleRequest,
  UpdateStatusRequest,
  ListVehiclesQuery,
  AvailabilityQuery,
  CalendarMatrixQuery,
} from "./vehicles.dto";
import type { Vehicle } from "@/worker/core/database/schema";

export class VehiclesService {
  constructor(
    private vehicleRepo: VehiclesRepository,
    private bookingRepo?: BookingsRepository,
    private maintenanceRepo?: MaintenanceRepository,
  ) {}

  private toResponse(vehicle: Vehicle): VehicleResponse {
    return {
      id: vehicle.id,
      name: vehicle.name,
      plateNumber: vehicle.plateNumber,
      type: vehicle.type,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      dailyRateIdr: vehicle.dailyRateIdr,
      dailyRateUsd: vehicle.dailyRateUsd,
      description: vehicle.description,
      status: vehicle.status,
      totalKm: vehicle.totalKm,
      photoUrl: vehicle.photoUrl,
      createdAt: vehicle.createdAt,
    };
  }

  async list(query: ListVehiclesQuery): Promise<{
    items: VehicleResponse[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { items, total } = await this.vehicleRepo.list(query);
    const totalPages = Math.ceil(total / query.limit);

    return {
      items: items.map((v) => this.toResponse(v)),
      meta: { page: query.page, limit: query.limit, total, totalPages },
    };
  }

  async getById(id: string): Promise<VehicleWithDetails | null> {
    const vehicle = await this.vehicleRepo.findById(id);
    if (!vehicle) return null;

    const statusLogs = await this.vehicleRepo.getStatusLogs(id);

    return {
      ...this.toResponse(vehicle),
      currentBooking: null,
      upcomingBookings: [],
      maintenanceHistory: [],
      statusLogs,
    };
  }

  async create(data: CreateVehicleRequest): Promise<VehicleResponse> {
    const existingByPlate = await this.vehicleRepo.findByPlateNumber(
      data.plateNumber,
    );
    if (existingByPlate) {
      throw new ConflictError("Vehicle with this plate number already exists");
    }

    const vehicle = await this.vehicleRepo.create({
      name: data.name,
      plateNumber: data.plateNumber,
      type: data.type,
      brand: data.brand ?? null,
      model: data.model ?? null,
      year: data.year ?? null,
      dailyRateIdr: data.dailyRateIdr,
      dailyRateUsd: data.dailyRateUsd ?? null,
      description: data.description ?? null,
      photoUrl: data.photoUrl ?? null,
      status: "Available",
      totalKm: 0,
    });

    return this.toResponse(vehicle);
  }

  async update(
    id: string,
    data: UpdateVehicleRequest,
  ): Promise<VehicleResponse> {
    const existing = await this.vehicleRepo.findById(id);
    if (!existing) throw new NotFoundError("Vehicle");

    if (data.plateNumber && data.plateNumber !== existing.plateNumber) {
      const existingByPlate = await this.vehicleRepo.findByPlateNumber(
        data.plateNumber,
      );
      if (existingByPlate)
        throw new ConflictError(
          "Vehicle with this plate number already exists",
        );
    }

    const vehicle = await this.vehicleRepo.update(id, {
      name: data.name,
      plateNumber: data.plateNumber,
      type: data.type,
      brand: data.brand,
      model: data.model,
      year: data.year,
      dailyRateIdr: data.dailyRateIdr,
      dailyRateUsd: data.dailyRateUsd,
      description: data.description,
      totalKm: data.totalKm,
      photoUrl: data.photoUrl,
    });

    if (!vehicle) throw new NotFoundError("Vehicle");

    return this.toResponse(vehicle);
  }

  async updateStatus(
    id: string,
    data: UpdateStatusRequest,
    userId: string,
  ): Promise<{
    vehicle: VehicleResponse;
    statusLog: {
      statusFrom: string;
      statusTo: string;
      notes: string | null;
      recordedBy: string;
      createdAt: string;
    };
  }> {
    const existing = await this.vehicleRepo.findById(id);
    if (!existing) throw new NotFoundError("Vehicle");

    const vehicle = await this.vehicleRepo.updateStatus(id, data.status);
    if (!vehicle) throw new NotFoundError("Vehicle");

    await this.vehicleRepo.createStatusLog({
      vehicleId: id,
      statusFrom: existing.status,
      statusTo: data.status,
      notes: data.notes ?? null,
      recordedBy: userId,
    });

    return {
      vehicle: this.toResponse(vehicle),
      statusLog: {
        statusFrom: existing.status,
        statusTo: data.status,
        notes: data.notes ?? null,
        recordedBy: userId,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async delete(id: string): Promise<void> {
    const existing = await this.vehicleRepo.findById(id);
    if (!existing) throw new NotFoundError("Vehicle");

    // Refuse if there are active/upcoming bookings referencing this vehicle
    if (this.bookingRepo) {
      const activeCount = await this.bookingRepo.countActiveByVehicle(id);
      if (activeCount > 0) {
        throw new ConflictError(
          "Cannot delete vehicle with active or upcoming bookings"
        );
      }
    }

    await this.vehicleRepo.delete(id);
  }

  async checkAvailability(
    query: AvailabilityQuery,
  ): Promise<AvailabilityResult> {
    if (query.startDate > query.endDate) {
      throw new ValidationError(
        "Start date must be before or equal to end date",
      );
    }

    let vehiclesToCheck: Vehicle[];
    if (query.vehicleId) {
      const vehicle = await this.vehicleRepo.findById(query.vehicleId);
      if (!vehicle) throw new NotFoundError("Vehicle");
      vehiclesToCheck = [vehicle];
    } else {
      vehiclesToCheck = await this.vehicleRepo.getAvailableVehicles(query.type);
    }

    const availableVehicles: AvailabilityResult["availableVehicles"] = [];
    const unavailableVehicles: AvailabilityResult["unavailableVehicles"] = [];
    const maintenanceVehicles: AvailabilityResult["maintenanceVehicles"] = [];

    for (const vehicle of vehiclesToCheck) {
      // Skip inactive vehicles
      if (vehicle.status === "Inactive") continue;

      // If vehicle is already in maintenance status, mark as maintenance
      if (vehicle.status === "Maintenance") {
        maintenanceVehicles.push({
          id: vehicle.id,
          name: vehicle.name,
          reason: "Vehicle is under maintenance",
          maintenanceEndDate: null,
        });
        continue;
      }

      // Check maintenance conflicts
      let maintenanceConflict = null;
      if (this.maintenanceRepo) {
        const conflicts = await this.maintenanceRepo.findConflictingMaintenance(
          vehicle.id,
          query.startDate,
          query.endDate,
        );
        if (conflicts.length > 0) {
          maintenanceConflict = conflicts[0];
        }
      }

      if (maintenanceConflict) {
        maintenanceVehicles.push({
          id: vehicle.id,
          name: vehicle.name,
          reason: `Scheduled maintenance: ${maintenanceConflict.description}`,
          maintenanceEndDate: maintenanceConflict.endDate ?? null,
        });
        continue;
      }

      // Check booking conflicts
      let bookingConflict = null;
      if (this.bookingRepo) {
        const conflicts = await this.bookingRepo.findConflictingBookings(
          vehicle.id,
          query.startDate,
          query.endDate,
        );
        if (conflicts.length > 0) {
          bookingConflict = conflicts[0];
        }
      }

      if (bookingConflict) {
        unavailableVehicles.push({
          id: vehicle.id,
          name: vehicle.name,
          reason: "Already booked",
          conflictingBooking: {
            id: bookingConflict.id,
            startDate: bookingConflict.startDate,
            endDate: bookingConflict.endDate,
          },
        });
        continue;
      }

      // Available
      availableVehicles.push({
        id: vehicle.id,
        name: vehicle.name,
        type: vehicle.type,
        dailyRateIdr: vehicle.dailyRateIdr,
        plateNumber: vehicle.plateNumber,
      });
    }

    return {
      requestedPeriod: { startDate: query.startDate, endDate: query.endDate },
      availableVehicles,
      unavailableVehicles,
      maintenanceVehicles,
    };
  }

  async getCalendar(vehicleId: string, month: string): Promise<CalendarResult> {
    const vehicle = await this.vehicleRepo.findById(vehicleId);
    if (!vehicle) throw new NotFoundError("Vehicle");

    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const calendar: CalendarResult["calendar"] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      calendar.push({ date: dateStr, status: "available" });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { vehicleId, month, calendar };
  }

  /**
   * Admin fleet calendar matrix: every vehicle (row) × every day of the month
   * (column), each cell marked available/booked/maintenance/inactive with the
   * booking summary attached when booked.
   */
  async getCalendarMatrix(query: CalendarMatrixQuery): Promise<CalendarMatrixResult> {
    const [year, monthNum] = query.month.split("-").map(Number);
    const pad = (n: number) => String(n).padStart(2, "0");

    const monthStart = `${query.month}-01`;
    const endDateExclusive =
      monthNum === 12 ? `${year + 1}-01-01` : `${year}-${pad(monthNum + 1)}-01`;

    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const allDays: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      allDays.push(`${query.month}-${pad(d)}`);
    }

    const { items: fleet } = await this.vehicleRepo.list({
      page: 1,
      limit: 1000,
      type: query.type,
      status: query.status,
    });

    const rangeBookings = this.bookingRepo
      ? await this.bookingRepo.findBookingsInRangeWithCustomer(monthStart, endDateExclusive)
      : [];

    const vehicles: CalendarMatrixResult["vehicles"] = [];
    for (const v of fleet) {
      const dates: Record<string, CalendarMatrixCell> = {};
      const baseStatus: CalendarMatrixCell["status"] =
        v.status === "Inactive"
          ? "inactive"
          : v.status === "Maintenance"
            ? "maintenance"
            : "available";
      for (const day of allDays) {
        dates[day] = { status: baseStatus };
      }

      // Overlay scheduled maintenance windows (only relevant for otherwise-available vehicles)
      if (this.maintenanceRepo && baseStatus === "available") {
        const conflicts = await this.maintenanceRepo.findConflictingMaintenance(
          v.id,
          monthStart,
          endDateExclusive,
        );
        for (const m of conflicts) {
          const mEnd = m.endDate ?? "9999-12-31";
          for (const day of allDays) {
            if (day >= m.startDate && day <= mEnd) {
              dates[day] = { status: "maintenance" };
            }
          }
        }
      }

      // Overlay bookings (booked takes precedence over maintenance for display)
      const vBookings = rangeBookings.filter((b) => b.vehicleId === v.id);
      for (const b of vBookings) {
        for (const day of allDays) {
          if (day >= b.startDate && day <= b.endDate) {
            dates[day] = {
              status: "booked",
              booking: {
                id: b.id,
                bookingNumber: b.bookingNumber,
                customerName: b.customerName,
                customerPhone: b.customerPhone,
              },
            };
          }
        }
      }

      vehicles.push({
        id: v.id,
        name: v.name,
        type: v.type,
        plateNumber: v.plateNumber,
        status: v.status,
        dates,
      });
    }

    return { month: query.month, vehicles };
  }

	async checkAvailabilityForDates(
		vehicleId: string,
		startDate: string,
		endDate: string,
	): Promise<boolean> {
		const vehicle = await this.vehicleRepo.findById(vehicleId);
		if (!vehicle) return false;

		if (vehicle.status === "Maintenance" || vehicle.status === "Inactive")
			return false;

		if (this.maintenanceRepo) {
			const mConflicts = await this.maintenanceRepo.findConflictingMaintenance(
				vehicleId,
				startDate,
				endDate,
			);
			if (mConflicts.length > 0) return false;
		}

		if (this.bookingRepo) {
			const bConflicts = await this.bookingRepo.findConflictingBookings(
				vehicleId,
				startDate,
				endDate,
			);
			if (bConflicts.length > 0) return false;
		}

		return true;
	}

	async getAvailabilityTimeline(): Promise<{
		vehicles: {
			id: string;
			name: string;
			type: string;
			plateNumber: string;
			status: string;
			currentBooking: {
				bookingNumber: string;
				customerName: string;
				endDate: string;
			} | null;
			nextAvailableDate: string | null;
		}[];
		summary: {
			total: number;
			available: number;
			rented: number;
			maintenance: number;
			inactive: number;
		};
	}> {
		const { items: allVehicles } = await this.vehicleRepo.list({ page: 1, limit: 1000 });
		const today = new Date().toISOString().split('T')[0]!;

		const summary = { total: 0, available: 0, rented: 0, maintenance: 0, inactive: 0 };
		const vehicles: {
			id: string;
			name: string;
			type: string;
			plateNumber: string;
			status: string;
			currentBooking: { bookingNumber: string; customerName: string; endDate: string } | null;
			nextAvailableDate: string | null;
		}[] = [];

		for (const v of allVehicles) {
			summary.total++;
			if (v.status === 'Available') summary.available++;
			else if (v.status === 'Maintenance') summary.maintenance++;
			else if (v.status === 'Inactive') summary.inactive++;
			else if (v.status === 'Rented') summary.rented++;

			// Find current/next booking for this vehicle
			let currentBooking: { bookingNumber: string; customerName: string; endDate: string } | null = null;
			let nextAvailableDate: string | null = null;

			if (this.bookingRepo) {
				const todayBookings = await this.bookingRepo.findConflictingBookings(v.id, today, today);
				if (todayBookings.length > 0) {
					const b = todayBookings[0]!;
					currentBooking = {
						bookingNumber: b.bookingNumber,
						customerName: 'Customer',
						endDate: b.endDate,
					};
					// Next available is day after endDate
					const endDate = new Date(b.endDate);
					endDate.setDate(endDate.getDate() + 1);
					nextAvailableDate = endDate.toISOString().split('T')[0]!;
				} else {
					// Find next upcoming booking
					const futureDate = new Date();
					futureDate.setMonth(futureDate.getMonth() + 1);
					const futureEnd = futureDate.toISOString().split('T')[0]!;
					const upcoming = await this.bookingRepo.findConflictingBookings(v.id, today, futureEnd);
					if (upcoming.length > 0) {
						// Vehicle is available now but has upcoming booking
						nextAvailableDate = upcoming[0]!.startDate;
					}
				}
			}

			vehicles.push({
				id: v.id,
				name: v.name,
				type: v.type,
				plateNumber: v.plateNumber,
				status: v.status,
				currentBooking,
				nextAvailableDate,
			});
		}

		return { vehicles, summary };
	}
}
