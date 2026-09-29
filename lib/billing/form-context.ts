import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { leads, organizations, stockItems, vehicles } from "@/db/schema";
import type { EditorLineItem, StockOption } from "@/components/billing/line-items-editor";
import { rentalDays } from "@/lib/rental-dates";

// What the quotation/invoice forms need from the org: GST defaults and the
// stock list for "from inventory" lines.
export async function billingFormContext(orgId: string): Promise<{
  defaultGstRate: number;
  orgStateCode: string | null;
  stockOptions: StockOption[];
}> {
  const [[org], stock] = await Promise.all([
    db
      .select({ defaultGstRate: organizations.defaultGstRate, stateCode: organizations.stateCode })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1),
    db
      .select({ id: stockItems.id, name: stockItems.name, unit: stockItems.unit, quantityOnHand: stockItems.quantityOnHand })
      .from(stockItems)
      .where(eq(stockItems.orgId, orgId))
      .orderBy(asc(stockItems.name))
      .limit(500),
  ]);
  return { defaultGstRate: org?.defaultGstRate ?? 18, orgStateCode: org?.stateCode ?? null, stockOptions: stock };
}

// A lead with rental dates and a vehicle that has a daily rate pre-fills
// one line: "<vehicle> rental, N days" × rate.
export async function rentalLineForLead(orgId: string, leadId: string): Promise<EditorLineItem | null> {
  const [row] = await db
    .select({
      rentalStart: leads.rentalStart,
      rentalEnd: leads.rentalEnd,
      reg: vehicles.registrationNumber,
      make: vehicles.make,
      model: vehicles.model,
      dailyRate: vehicles.dailyRate,
    })
    .from(leads)
    .innerJoin(vehicles, eq(leads.vehicleId, vehicles.id))
    .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)))
    .limit(1);
  if (!row?.rentalStart || !row.rentalEnd || !row.dailyRate) return null;

  const days = rentalDays(row.rentalStart, row.rentalEnd);
  const name = [row.make, row.model].filter(Boolean).join(" ") || "Vehicle";
  return {
    description: `${name} (${row.reg}) rental, ${row.rentalStart} to ${row.rentalEnd}`,
    quantity: days,
    unitPrice: Number(row.dailyRate),
    hsnSac: "9966",
  };
}
