"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { leadSourceEnum, leads, organizations } from "@/db/schema";
import { generatePublicToken } from "@/lib/tokens";

const bookingSchema = z.object({
  contactName: z.string().trim().min(1, "Name is required"),
  contactPhone: z.string().trim().min(1, "Phone is required"),
  interest: z.string().trim().min(1, "Tell us what you need"),
  preferredTime: z.string().trim().optional(),
});

export async function submitBooking(slug: string, _prevState: { error: string | null }, formData: FormData) {
  const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug)).limit(1);

  if (!org) {
    return { error: "This booking link isn't valid." };
  }

  const parsed = bookingSchema.safeParse({
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    interest: formData.get("interest"),
    preferredTime: formData.get("preferredTime"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const interest = parsed.data.preferredTime
    ? `${parsed.data.interest} (preferred: ${parsed.data.preferredTime})`
    : parsed.data.interest;

  const [lead] = await db
    .insert(leads)
    .values({
      orgId: org.id,
      contactName: parsed.data.contactName,
      contactPhone: parsed.data.contactPhone,
      interest,
      source: "website" satisfies (typeof leadSourceEnum.enumValues)[number],
      publicToken: generatePublicToken(),
    })
    .returning({ publicToken: leads.publicToken });

  redirect(`/status/${lead.publicToken}?new=1`);
}
