"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { customers, leadActivities, leadSourceEnum, leadStageEnum, leads, organizations, profiles, trackingLinks, vehicles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { generatePublicToken } from "@/lib/tokens";
import { getSiteUrl } from "@/lib/site";
import { sendWhatsApp } from "@/lib/whatsapp";
import { changeLeadStage, recordStageChange } from "@/lib/lead-stage";


// A tracking link picked in a form must belong to this org; blank = none.
async function orgTrackingLinkId(orgId: string, raw: FormDataEntryValue | null): Promise<string | null | "invalid"> {
  const id = typeof raw === "string" ? raw.trim() : "";
  if (!id) return null;
  const [link] = await db
    .select({ id: trackingLinks.id })
    .from(trackingLinks)
    .where(and(eq(trackingLinks.id, id), eq(trackingLinks.orgId, orgId)))
    .limit(1);
  return link ? link.id : "invalid";
}

const createLeadSchema = z.object({
  contactName: z.string().trim().min(1, "Name is required"),
  contactPhone: z.string().trim().min(1, "Phone is required"),
  interest: z.string().trim().min(1, "Say what they're enquiring about"),
  source: z.enum(leadSourceEnum.enumValues),
});

export async function createLead(_prevState: { error: string | null }, formData: FormData) {
  const user = await requireUser();

  const parsed = createLeadSchema.safeParse({
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    interest: formData.get("interest"),
    source: formData.get("source"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const trackingLinkId = await orgTrackingLinkId(user.orgId, formData.get("trackingLinkId"));
  if (trackingLinkId === "invalid") return { error: "That tracking link doesn't exist." };

  const [created] = await db
    .insert(leads)
    .values({
      orgId: user.orgId,
      assignedTo: user.id,
      publicToken: generatePublicToken(),
      trackingLinkId,
      ...parsed.data,
    })
    .returning({ id: leads.id });
  await recordStageChange({ orgId: user.orgId, leadId: created.id, from: null, to: "new", changedBy: user.id });

  revalidatePath("/leads");
  return { error: null };
}

export async function updateLeadStage(
  leadId: string,
  stage: (typeof leadStageEnum.enumValues)[number],
) {
  const user = await requireUser();

  const changed = await changeLeadStage({ orgId: user.orgId, leadId, to: stage, changedBy: user.id });
  if (!changed) return;

  await db.insert(leadActivities).values({
    leadId,
    authorId: user.id,
    kind: "stage_change",
    body: `Moved to ${stage.replace("_", " ")}`,
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

const updateLeadSchema = z.object({
  contactName: z.string().trim().min(1, "Name is required"),
  contactPhone: z.string().trim().min(1, "Phone is required"),
  interest: z.string().trim().min(1, "Say what they're enquiring about"),
  source: z.enum(leadSourceEnum.enumValues),
  followUpAt: z
    .string()
    .optional()
    .transform((value) => (value ? new Date(value) : null)),
});

export async function updateLead(leadId: string, _prevState: { error: string | null }, formData: FormData) {
  const user = await requireUser();

  const parsed = updateLeadSchema.safeParse({
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    interest: formData.get("interest"),
    source: formData.get("source"),
    followUpAt: formData.get("followUpAt") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  // Only touch attribution when the form actually sent the field.
  let trackingPatch: { trackingLinkId?: string | null } = {};
  if (formData.has("trackingLinkId")) {
    const trackingLinkId = await orgTrackingLinkId(user.orgId, formData.get("trackingLinkId"));
    if (trackingLinkId === "invalid") return { error: "That tracking link doesn't exist." };
    trackingPatch = { trackingLinkId };
  }

  await db
    .update(leads)
    .set({ ...parsed.data, ...trackingPatch, updatedAt: new Date() })
    .where(and(eq(leads.id, leadId), eq(leads.orgId, user.orgId)));

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return { error: null };
}

export async function assignLead(leadId: string, assigneeId: string) {
  const user = await requireUser();

  let nextAssignee: string | null = null;
  if (assigneeId !== "unassigned") {
    const [assignee] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.id, assigneeId), eq(profiles.orgId, user.orgId)))
      .limit(1);
    if (!assignee) return;
    nextAssignee = assignee.id;
  }

  await db
    .update(leads)
    .set({ assignedTo: nextAssignee, updatedAt: new Date() })
    .where(and(eq(leads.id, leadId), eq(leads.orgId, user.orgId)));

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}

const addNoteSchema = z.object({
  body: z.string().trim().min(1, "Write something first"),
});

export async function addLeadNote(leadId: string, _prevState: { error: string | null }, formData: FormData) {
  const user = await requireUser();

  const parsed = addNoteSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the note and try again." };
  }

  const [lead] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.orgId, user.orgId)))
    .limit(1);

  if (!lead) {
    return { error: "Lead not found." };
  }

  await db.insert(leadActivities).values({
    leadId,
    authorId: user.id,
    kind: "note",
    body: parsed.data.body,
  });

  revalidatePath(`/leads/${leadId}`);
  return { error: null };
}

export async function convertLeadToCustomer(
  leadId: string,
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await requireUser();

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.orgId, user.orgId)))
    .limit(1);

  if (!lead) return { error: "Lead not found." };
  if (lead.customerId) return { error: "This lead is already a customer." };

  const [org] = await db
    .select({ serviceIntervalDays: organizations.serviceIntervalDays })
    .from(organizations)
    .where(eq(organizations.id, user.orgId))
    .limit(1);

  const vehicleNumber = String(formData.get("vehicleNumber") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;

  const now = new Date();
  const nextServiceDueAt = new Date(now);
  nextServiceDueAt.setDate(nextServiceDueAt.getDate() + (org?.serviceIntervalDays ?? 30));

  const [customer] = await db
    .insert(customers)
    .values({
      orgId: user.orgId,
      fullName: lead.contactName,
      phone: lead.contactPhone,
      email,
      vehicleNumber,
      lastServiceAt: now,
      nextServiceDueAt,
    })
    .returning({ id: customers.id });

  await db
    .update(leads)
    .set({ customerId: customer.id, updatedAt: new Date() })
    .where(eq(leads.id, leadId));
  await changeLeadStage({ orgId: user.orgId, leadId, to: "booked", changedBy: user.id });

  await db.insert(leadActivities).values({
    leadId,
    authorId: user.id,
    kind: "stage_change",
    body: "Converted to customer and marked booked",
  });

  const statusUrl = `${getSiteUrl()}/status/${lead.publicToken}`;
  await sendWhatsApp({
    orgId: user.orgId,
    to: lead.contactPhone,
    kind: "vehicle_received",
    customerId: customer.id,
    leadId,
    body: `Hi ${lead.contactName}, we've got your booking for "${lead.interest}". Track it here: ${statusUrl}`,
    templateParams: [lead.contactName, statusUrl],
  });
  await db.insert(leadActivities).values({
    leadId,
    authorId: user.id,
    kind: "whatsapp",
    body: "Sent vehicle-received WhatsApp message",
  });

  revalidatePath("/leads");
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function notifyReadyForPickup(leadId: string) {
  const user = await requireUser();

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.orgId, user.orgId)))
    .limit(1);

  if (!lead) return;

  const statusUrl = `${getSiteUrl()}/status/${lead.publicToken}`;
  await sendWhatsApp({
    orgId: user.orgId,
    to: lead.contactPhone,
    kind: "ready_for_pickup",
    customerId: lead.customerId ?? undefined,
    leadId,
    body: `Hi ${lead.contactName}, your vehicle is ready for pickup! View your booking and bill: ${statusUrl}`,
    templateParams: [lead.contactName, statusUrl],
  });

  await db.insert(leadActivities).values({
    leadId,
    authorId: user.id,
    kind: "whatsapp",
    body: "Sent ready-for-pickup WhatsApp message",
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function assignVehicleToLead(leadId: string, vehicleId: string) {
  const user = await requireUser();

  let nextVehicleId: string | null = null;
  if (vehicleId !== "none") {
    const [vehicle] = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.orgId, user.orgId)))
      .limit(1);
    if (!vehicle) return;
    nextVehicleId = vehicle.id;
  }

  const [updated] = await db
    .update(leads)
    .set({ vehicleId: nextVehicleId, updatedAt: new Date() })
    .where(and(eq(leads.id, leadId), eq(leads.orgId, user.orgId)))
    .returning({ stage: leads.stage });

  if (updated?.stage === "booked" && nextVehicleId) {
    await db
      .update(vehicles)
      .set({ status: "rented", updatedAt: new Date() })
      .where(and(eq(vehicles.id, nextVehicleId), eq(vehicles.status, "available")));
    revalidatePath("/vehicles");
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}
