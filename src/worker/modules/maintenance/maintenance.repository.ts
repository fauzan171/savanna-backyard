import { eq, and, desc, gte, lt, or } from "drizzle-orm";
import { maintenanceRecords } from "@/worker/core/database/schema";
import type { Database } from "@/worker/core/database";
import type { ListMaintenanceQuery } from "./maintenance.dto";

export class MaintenanceRepository {
  constructor(private db: Database) {}

  async findById(
    id: string,
  ): Promise<typeof maintenanceRecords.$inferSelect | null> {
    const result = await this.db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async list(query: ListMaintenanceQuery): Promise<{
    items: (typeof maintenanceRecords.$inferSelect)[];
    total: number;
  }> {
    const offset = (query.page - 1) * query.limit;
    const conditions = [];

    if (query.status) {
      conditions.push(eq(maintenanceRecords.status, query.status));
    }

    if (query.type) {
      conditions.push(eq(maintenanceRecords.type, query.type));
    }

    if (query.vehicleId) {
      conditions.push(eq(maintenanceRecords.vehicleId, query.vehicleId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await this.db
      .select()
      .from(maintenanceRecords)
      .where(whereClause)
      .orderBy(desc(maintenanceRecords.startDate))
      .limit(query.limit)
      .offset(offset);

    const countResult = await this.db
      .select({ id: maintenanceRecords.id })
      .from(maintenanceRecords)
      .where(whereClause);

    const total = countResult.length;

    return { items, total };
  }

  async create(
    data: Omit<typeof maintenanceRecords.$inferInsert, "id">,
  ): Promise<typeof maintenanceRecords.$inferSelect> {
    const id = crypto.randomUUID();
    await this.db.insert(maintenanceRecords).values({ id, ...data });
    const record = await this.findById(id);
    if (!record) {
      throw new Error("Failed to create maintenance record");
    }
    return record;
  }

  async update(
    id: string,
    data: Partial<
      Omit<
        typeof maintenanceRecords.$inferInsert,
        "id" | "createdAt" | "createdBy"
      >
    >,
  ): Promise<typeof maintenanceRecords.$inferSelect | null> {
    await this.db
      .update(maintenanceRecords)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(maintenanceRecords.id, id));
    return this.findById(id);
  }

  async findByVehicleId(
    vehicleId: string,
    limit = 50,
  ): Promise<(typeof maintenanceRecords.$inferSelect)[]> {
    return this.db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.vehicleId, vehicleId))
      .orderBy(desc(maintenanceRecords.startDate))
      .limit(limit);
  }

  async findActiveByVehicleId(
    vehicleId: string,
  ): Promise<typeof maintenanceRecords.$inferSelect | null> {
    const result = await this.db
      .select()
      .from(maintenanceRecords)
      .where(
        and(
          eq(maintenanceRecords.vehicleId, vehicleId),
          or(
            eq(maintenanceRecords.status, "Scheduled"),
            eq(maintenanceRecords.status, "InProgress"),
          ),
        ),
      )
      .orderBy(desc(maintenanceRecords.startDate))
      .limit(1);
    return result[0] ?? null;
  }

  // Check if vehicle has scheduled/in-progress maintenance overlapping with date range
  async findConflictingMaintenance(
    vehicleId: string,
    startDate: string,
    endDate: string,
  ): Promise<(typeof maintenanceRecords.$inferSelect)[]> {
    const all = await this.db
      .select()
      .from(maintenanceRecords)
      .where(
        and(
          eq(maintenanceRecords.vehicleId, vehicleId),
          or(
            eq(maintenanceRecords.status, "Scheduled"),
            eq(maintenanceRecords.status, "InProgress"),
          ),
        ),
      );

    // Filter by date overlap in JS (endDate may be null for open-ended maintenance)
    return all.filter((m) => {
      const mStart = m.startDate;
      const mEnd = m.endDate ?? "9999-12-31"; // open-ended = blocks forever
      // Overlap: mStart < endDate AND mEnd > startDate
      return mStart < endDate && mEnd > startDate;
    });
  }

  async findUpcoming(
    days: number,
  ): Promise<(typeof maintenanceRecords.$inferSelect)[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    const todayStr = today.toISOString().split("T")[0];
    const futureStr = futureDate.toISOString().split("T")[0];

    return this.db
      .select()
      .from(maintenanceRecords)
      .where(
        and(
          or(
            eq(maintenanceRecords.status, "Scheduled"),
            eq(maintenanceRecords.status, "InProgress"),
          ),
          gte(maintenanceRecords.startDate, todayStr),
          lt(maintenanceRecords.startDate, futureStr),
        ),
      )
      .orderBy(maintenanceRecords.startDate);
  }

  async findOverdue(): Promise<(typeof maintenanceRecords.$inferSelect)[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    return this.db
      .select()
      .from(maintenanceRecords)
      .where(
        and(
          eq(maintenanceRecords.status, "Scheduled"),
          lt(maintenanceRecords.startDate, todayStr),
        ),
      )
      .orderBy(maintenanceRecords.startDate);
  }

  async findInProgress(): Promise<(typeof maintenanceRecords.$inferSelect)[]> {
    return this.db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.status, "InProgress"))
      .orderBy(maintenanceRecords.startDate);
  }

  async findScheduled(): Promise<(typeof maintenanceRecords.$inferSelect)[]> {
    return this.db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.status, "Scheduled"))
      .orderBy(maintenanceRecords.startDate);
  }

  async delete(id: string): Promise<boolean> {
    await this.db
      .delete(maintenanceRecords)
      .where(eq(maintenanceRecords.id, id));
    return true;
  }
}
