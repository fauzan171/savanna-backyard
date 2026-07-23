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
} from "./vehicles.types";
import type {
  CreateVehicleRequest,
  UpdateVehicleRequest,
  UpdateStatusRequest,
  ListVehiclesQuery,
  AvailabilityQuery,
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
		totalKm: data.totalKm,
		photoUrl: data.photoUrl,
		});

		if (!vehicle) throw new NotFoundError("Vehicle");

		return this.toResponse(vehicle);
	}

	/**
	 * Delete a vehicle. Blocked if the vehicle has active bookings or
	 * maintenance to preserve referential integrity and financial records.
	 */
	async delete(id: string): Promise<void> {
		const existing = await this.vehicleRepo.findById(id);
		if (!existing) throw new NotFoundError("Vehicle");

		const activeBookings = await this.vehicleRepo.countActiveBookings(id);
		if (activeBookings > 0) {
			throw new ConflictError(
				`Cannot delete vehicle with ${activeBookings} active booking(s). Complete or cancel them first.`,
			);
		}

		const activeMaintenance = await this.vehicleRepo.countActiveMaintenance(id);
		if (activeMaintenance > 0) {
			throw new ConflictError(
				`Cannot delete vehicle with ${activeMaintenance} active maintenance record(s). Complete them first.`,
			);
		}

		await this.vehicleRepo.delete(id);
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
}
