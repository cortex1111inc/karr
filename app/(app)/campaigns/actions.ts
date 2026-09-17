"use server";

import { and, eq, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { campaigns, customers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { sendWhatsApp } from "@/lib/whatsapp";

const campaignSchema = z.object({
  name: z.string().trim().min(1, "Give this campaign a name"),
  message: z.string().trim().min(1, "Write a message"),
  audience: z.enum(["all", "due"]),
});

export async function sendCampaign(_prevState: { error: string | null }, formData: FormData) {
  const user = await requireUser();

  const parsed = campaignSchema.safeParse({
    name: formData.get("name"),
    message: formData.get("message"),
    audience: formData.get("audience"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const conditions = [eq(customers.orgId, user.orgId)];
  if (parsed.data.audience === "due") {
    conditions.push(lte(customers.nextServiceDueAt, new Date()));
  }

  const audience = await db
    .select({ id: customers.id, fullName: customers.fullName, phone: customers.phone })
    .from(customers)
    .where(and(...conditions));

  if (audience.length === 0) {
    return { error: "No customers match this audience." };
  }

  const [campaign] = await db
    .insert(campaigns)
    .values({
      orgId: user.orgId,
      createdBy: user.id,
      name: parsed.data.name,
      message: parsed.data.message,
      audienceCount: audience.length,
    })
    .returning({ id: campaigns.id });

  let sentCount = 0;
  for (const customer of audience) {
    const personalized = parsed.data.message.replaceAll("{{name}}", customer.fullName);
    const result = await sendWhatsApp({
      orgId: user.orgId,
      to: customer.phone,
      kind: "campaign",
      customerId: customer.id,
      campaignId: campaign.id,
      body: personalized,
    });
    if (result.ok) sentCount += 1;
  }

  await db.update(campaigns).set({ sentCount }).where(eq(campaigns.id, campaign.id));

  revalidatePath("/campaigns");
  return { error: null };
}
