"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isStateCode, isValidGstin } from "@/lib/billing/gst";

const settingsSchema = z.object({
  serviceIntervalDays: z.coerce.number().int().min(1, "Must be at least 1 day").max(365, "Must be 365 days or fewer"),
  reminderMessage: z
    .string()
    .trim()
    .max(1000, "Keep it under 1000 characters")
    .optional()
    .transform((value) => value || null),
  staleLeadDays: z.coerce.number().int().min(1, "Must be at least 1 day").max(90, "Must be 90 days or fewer"),
  invoiceReminderDays: z.coerce.number().int().min(1, "Must be at least 1 day").max(90, "Must be 90 days or fewer"),
  invoiceReminderWhatsapp: z.boolean(),
});

export async function updateOrgSettings(_prevState: { error: string | null }, formData: FormData) {
  const user = await requireUser();

  if (user.role !== "owner") {
    return { error: "Only the workspace owner can change these settings." };
  }

  const parsed = settingsSchema.safeParse({
    serviceIntervalDays: formData.get("serviceIntervalDays"),
    reminderMessage: formData.get("reminderMessage"),
    staleLeadDays: formData.get("staleLeadDays"),
    invoiceReminderDays: formData.get("invoiceReminderDays"),
    invoiceReminderWhatsapp: formData.get("invoiceReminderWhatsapp") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  await db.update(organizations).set(parsed.data).where(eq(organizations.id, user.orgId));

  revalidatePath("/settings");
  return { error: null };
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const billingSettingsSchema = z.object({
  defaultGstRate: z.coerce.number().int("Use a whole number").min(0, "Can't be negative").max(100, "Must be 100 or less"),
  legalName: optionalText(200),
  gstin: optionalText(15)
    .transform((v) => v?.toUpperCase() ?? null)
    .refine((v) => !v || isValidGstin(v), "That GSTIN doesn't look right (15 characters, e.g. 32ABCDE1234F1Z5)"),
  billingAddress: optionalText(500),
  stateCode: optionalText(2).refine((v) => !v || isStateCode(v), "Pick a valid state"),
  logoUrl: optionalText(500).refine((v) => !v || /^https:\/\/\S+$/.test(v), "Logo URL must start with https://"),
  invoiceTerms: optionalText(1000),
});

export async function updateBillingSettings(_prevState: { error: string | null }, formData: FormData) {
  const user = await requireUser();

  if (user.role !== "owner") {
    return { error: "Only the workspace owner can change these settings." };
  }

  const field = (name: string) => String(formData.get(name) ?? "");
  const parsed = billingSettingsSchema.safeParse({
    defaultGstRate: formData.get("defaultGstRate"),
    legalName: field("legalName"),
    gstin: field("gstin"),
    billingAddress: field("billingAddress"),
    stateCode: field("stateCode"),
    logoUrl: field("logoUrl"),
    invoiceTerms: field("invoiceTerms"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  // A GSTIN fixes the state; keep them consistent.
  const data = { ...parsed.data, stateCode: parsed.data.gstin ? parsed.data.gstin.slice(0, 2) : parsed.data.stateCode };

  await db.update(organizations).set(data).where(eq(organizations.id, user.orgId));

  revalidatePath("/settings");
  return { error: null };
}
