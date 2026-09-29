import "server-only";
import { and, eq, gte, isNotNull, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { leads, vehicles } from "@/db/schema";

export { parseRentalRange } from "@/lib/rental-dates";

// Another non-lost lead holding this vehicle on overlapping dates.
export async function findVehicleConflict(input: {
  orgId: string;
  vehicleId: string;
  rentalStart: string;
  rentalEnd: string;
  excludeLeadId: string;
}) {
  const [conflict] = await db
    .select({ id: leads.id, contactName: leads.contactName, rentalStart: leads.rentalStart, rentalEnd: leads.rentalEnd })
    .from(leads)
    .where(
      and(
        eq(leads.orgId, input.orgId),
        eq(leads.vehicleId, input.vehicleId),
        ne(leads.id, input.excludeLeadId),
        ne(leads.stage, "lost"),
        isNotNull(leads.rentalStart),
        lte(leads.rentalStart, input.rentalEnd),
        gte(leads.rentalEnd, input.rentalStart),
      ),
    )
    .limit(1);
  return conflict ?? null;
}

export function conflictMessage(c: { contactName: string; rentalStart: string | null; rentalEnd: string | null }) {
  return `That vehicle is already booked for ${c.contactName} (${c.rentalStart} to ${c.rentalEnd}).`;
}

// Daily cron: a rented vehicle goes back to available once every booked
// rental on it has ended. Booked leads without dates keep it rented (the
// status was set by hand, so it's changed by hand).
export async function returnFinishedRentals(): Promise<number> {
  const rows = await db
    .update(vehicles)
    .set({ status: "available", updatedAt: new Date() })
    .where(
      and(
        eq(vehicles.status, "rented"),
        sql`EXISTS (SELECT 1 FROM ${leads} WHERE ${leads.vehicleId} = ${vehicles.id} AND ${leads.stage} = 'booked' AND ${leads.rentalEnd} < current_date)`,
        sql`NOT EXISTS (SELECT 1 FROM ${leads} WHERE ${leads.vehicleId} = ${vehicles.id} AND ${leads.stage} = 'booked' AND (${leads.rentalEnd} IS NULL OR ${leads.rentalEnd} >= current_date))`,
      ),
    )
    .returning({ id: vehicles.id });
  return rows.length;
}
