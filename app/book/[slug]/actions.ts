"use server";

import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { leadSourceEnum, leads, organizations, trackingLinks } from "@/db/schema";
import { REF_COOKIE } from "@/lib/growth";
import { generatePublicToken } from "@/lib/tokens";
import { clientKey, consumeRateLimit } from "@/lib/rate-limit";

const bookingSchema = z.object({
  contactName: z.string().trim().min(1, "Name is required").max(100),
  contactPhone: z
    .string()
    .trim()
    .refine((v) => {
      const digits = v.replace(/\D/g, "").length;
      return digits >= 7 && digits <= 15;
    }, "Enter a valid phone number"),
  interest: z.string().trim().min(1, "Tell us what you need").max(1000),
  preferredTime: z.string().trim().max(200).optional(),
});

const MIN_FILL_MS = 3000;
const GENERIC_ERROR = { error: "Something went wrong — please try again in a moment." };

export async function submitBooking(slug: string, _prevState: { error: string | null }, formData: FormData) {
  // Honeypot: a field hidden from people but filled by naive bots.
  if (String(formData.get("website") ?? "").length > 0) return GENERIC_ERROR;

  // Submitted faster than a human can type — only checked when the client
  // stamped a start time (it does unless JS is off).
  const startedAt = Number(formData.get("startedAt"));
  if (startedAt > 0 && Date.now() - startedAt < MIN_FILL_MS) return GENERIC_ERROR;

  if (!(await consumeRateLimit(await clientKey("booking"), 5, 600))) {
    return { error: "Too many requests from this connection — please try again in a few minutes." };
  }

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

  const trackingLinkId = await resolveAttribution(org.id, String(formData.get("ref") ?? ""));

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
      trackingLinkId,
      publicToken: generatePublicToken(),
    })
    .returning({ publicToken: leads.publicToken });

  redirect(`/status/${lead.publicToken}?new=1`);
}

// Which tracking link gets credit: an explicit ?ref=<code> on the page wins,
// otherwise the 30-day cookie set by /r/... . Both are resolved within this
// org only, and archived links never get credit.
async function resolveAttribution(orgId: string, refCode: string): Promise<string | null> {
  const active = and(eq(trackingLinks.orgId, orgId), isNull(trackingLinks.archivedAt));
  if (refCode) {
    const [byCode] = await db
      .select({ id: trackingLinks.id })
      .from(trackingLinks)
      .where(and(active, eq(trackingLinks.code, refCode.toLowerCase().slice(0, 40))))
      .limit(1);
    if (byCode) return byCode.id;
  }
  const cookieId = (await cookies()).get(REF_COOKIE)?.value;
  if (cookieId && /^[0-9a-f-]{36}$/i.test(cookieId)) {
    const [byCookie] = await db
      .select({ id: trackingLinks.id })
      .from(trackingLinks)
      .where(and(active, eq(trackingLinks.id, cookieId)))
      .limit(1);
    if (byCookie) return byCookie.id;
  }
  return null;
}
