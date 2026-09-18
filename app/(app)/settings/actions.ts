"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const settingsSchema = z.object({
  serviceIntervalDays: z.coerce.number().int().min(1, "Must be at least 1 day").max(365, "Must be 365 days or fewer"),
  reminderMessage: z
    .string()
    .trim()
    .max(1000, "Keep it under 1000 characters")
    .optional()
    .transform((value) => value || null),
  staleLeadDays: z.coerce.number().int().min(1, "Must be at least 1 day").max(90, "Must be 90 days or fewer"),
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
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  await db.update(organizations).set(parsed.data).where(eq(organizations.id, user.orgId));

  revalidatePath("/settings");
  return { error: null };
}
