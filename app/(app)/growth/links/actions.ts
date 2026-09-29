"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { trackingLinks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { generateLinkCode, isValidLinkCode } from "@/lib/growth";

const linkSchema = z.object({
  name: z.string().trim().min(1, "Give the link a name").max(100),
  partnerName: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => v || null),
  channel: z.enum(["influencer", "instagram_ads", "google_ads", "flyer", "other"]),
  code: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || isValidLinkCode(v), "Use lowercase letters, numbers and dashes (2–40 characters)"),
  commissionType: z.enum(["none", "flat", "percent"]),
  commissionValue: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Commission must be a positive number"),
});

export async function createTrackingLink(_prev: { error: string | null }, formData: FormData) {
  const user = await requireUser();
  const parsed = linkSchema.safeParse({
    name: formData.get("name"),
    partnerName: formData.get("partnerName"),
    channel: formData.get("channel"),
    code: formData.get("code"),
    commissionType: formData.get("commissionType"),
    commissionValue: formData.get("commissionValue"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const d = parsed.data;
  if (d.commissionType === "percent" && d.commissionValue !== null && d.commissionValue > 100) {
    return { error: "A percentage commission can't exceed 100%." };
  }

  // A custom code gets one attempt (the owner chose it); a generated one
  // retries on the rare collision.
  const attempts = d.code ? [d.code] : Array.from({ length: 5 }, () => generateLinkCode(d.partnerName ?? d.name));
  for (const code of attempts) {
    const inserted = await db
      .insert(trackingLinks)
      .values({
        orgId: user.orgId,
        name: d.name,
        partnerName: d.partnerName,
        channel: d.channel,
        code,
        commissionType: d.commissionType,
        commissionValue: d.commissionType === "none" || d.commissionValue === null ? null : String(d.commissionValue),
      })
      .onConflictDoNothing()
      .returning({ id: trackingLinks.id });
    if (inserted.length > 0) {
      revalidatePath("/growth/links");
      revalidatePath("/growth");
      return { error: null };
    }
  }
  return { error: d.code ? "That code is already used by another of your links." : "Couldn't generate a unique code — try again." };
}

export async function setTrackingLinkArchived(linkId: string, archived: boolean) {
  const user = await requireUser();
  await db
    .update(trackingLinks)
    .set({ archivedAt: archived ? new Date() : null })
    .where(and(eq(trackingLinks.id, linkId), eq(trackingLinks.orgId, user.orgId)));
  revalidatePath("/growth/links");
  revalidatePath("/growth");
}
