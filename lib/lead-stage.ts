import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { leadStageChanges, leadStageEnum, leads, vehicles } from "@/db/schema";

export type LeadStage = (typeof leadStageEnum.enumValues)[number];

// The single place a lead's stage changes. Records history, and keeps the
// assigned vehicle's status in step: a booked rental marks its vehicle
// rented. Returns the previous stage, or null if the lead wasn't found (in
// this org) or was already at `to`.
export async function changeLeadStage(input: {
  orgId: string;
  leadId: string;
  to: LeadStage;
  changedBy: string | null;
}): Promise<{ from: LeadStage } | null> {
  const [current] = await db
    .select({ stage: leads.stage, vehicleId: leads.vehicleId })
    .from(leads)
    .where(and(eq(leads.id, input.leadId), eq(leads.orgId, input.orgId)))
    .limit(1);
  if (!current || current.stage === input.to) return null;

  await db
    .update(leads)
    .set({ stage: input.to, updatedAt: new Date() })
    .where(and(eq(leads.id, input.leadId), eq(leads.orgId, input.orgId)));
  await recordStageChange({ ...input, from: current.stage });

  if (input.to === "booked" && current.vehicleId) {
    await db
      .update(vehicles)
      .set({ status: "rented", updatedAt: new Date() })
      .where(and(eq(vehicles.id, current.vehicleId), eq(vehicles.orgId, input.orgId), eq(vehicles.status, "available")));
  }
  return { from: current.stage };
}

// For leads created directly in a stage (new lead, public booking).
export async function recordStageChange(input: {
  orgId: string;
  leadId: string;
  from: LeadStage | null;
  to: LeadStage;
  changedBy: string | null;
}) {
  await db.insert(leadStageChanges).values({
    orgId: input.orgId,
    leadId: input.leadId,
    fromStage: input.from,
    toStage: input.to,
    changedBy: input.changedBy,
  });
}
