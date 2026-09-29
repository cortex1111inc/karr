"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orgSites, organizations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { parseServicesJson, siteSchema } from "@/lib/growth-site-schema";

export async function saveSite(_prev: { error: string | null }, formData: FormData) {
  const user = await requireUser();
  if (user.role !== "owner") return { error: "Only the workspace owner can edit the website." };

  const services = parseServicesJson(formData.get("servicesJson"));
  if (services === null) return { error: "Couldn't read the services list — try again." };

  const parsed = siteSchema.safeParse({
    published: formData.get("published") === "true",
    headline: formData.get("headline"),
    tagline: formData.get("tagline"),
    about: formData.get("about"),
    phone: formData.get("phone"),
    whatsappNumber: formData.get("whatsappNumber"),
    address: formData.get("address"),
    hours: formData.get("hours"),
    mapUrl: formData.get("mapUrl"),
    heroImageUrl: formData.get("heroImageUrl"),
    accent: formData.get("accent"),
    services,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  const values = { ...parsed.data, updatedAt: new Date() };
  await db
    .insert(orgSites)
    .values({ orgId: user.orgId, ...values })
    .onConflictDoUpdate({ target: orgSites.orgId, set: values });

  const [org] = await db.select({ slug: organizations.slug }).from(organizations).where(eq(organizations.id, user.orgId));
  revalidatePath("/growth/website");
  revalidatePath(`/site/${org.slug}`);
  return { error: null };
}
