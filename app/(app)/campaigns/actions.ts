"use server";

import { and, eq, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { campaigns, customers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { sendWhatsApp } from "@/lib/whatsapp";

const MAX_AUDIENCE = 500;
const SEND_CONCURRENCY = 5;

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
  if (audience.length > MAX_AUDIENCE) {
    return {
      error: `This audience has ${audience.length} customers — one send is limited to ${MAX_AUDIENCE}. Use "Due for service" to narrow it.`,
    };
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

  // Small parallel chunks: fast enough to finish inside the page's
  // maxDuration, gentle enough not to trip WhatsApp API rate limits.
  let sentCount = 0;
  for (let i = 0; i < audience.length; i += SEND_CONCURRENCY) {
    const chunk = audience.slice(i, i + SEND_CONCURRENCY);
    const results = await Promise.all(
      chunk.map((customer) =>
        sendWhatsApp({
          orgId: user.orgId,
          to: customer.phone,
          kind: "campaign",
          customerId: customer.id,
          campaignId: campaign.id,
          body: parsed.data.message.replaceAll("{{name}}", customer.fullName),
        }),
      ),
    );
    sentCount += results.filter((r) => r.ok).length;
  }

  await db.update(campaigns).set({ sentCount }).where(eq(campaigns.id, campaign.id));

  revalidatePath("/campaigns");
  return { error: null };
}
