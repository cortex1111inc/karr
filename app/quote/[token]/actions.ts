"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { profiles, quotations } from "@/db/schema";
import { notify } from "@/lib/notifications";
import { clientKey, consumeRateLimit } from "@/lib/rate-limit";

// Public, keyed on the quotation token only. Accept is final; a change
// request keeps the quote open and passes the message to the owner.
export async function respondToQuotation(
  token: string,
  _prev: { error: string | null; done?: "accepted" | "changes" },
  formData: FormData,
): Promise<{ error: string | null; done?: "accepted" | "changes" }> {
  if (!(await consumeRateLimit(await clientKey(`quote:${token}`), 5, 600))) {
    return { error: "Too many attempts — try again in a few minutes." };
  }

  const response = formData.get("response");
  const message = z.string().trim().max(1000).safeParse(formData.get("message") ?? "");
  if (!message.success) return { error: "Keep the message under 1000 characters." };
  if (response !== "accept" && response !== "changes") return { error: "Pick a response." };
  if (response === "changes" && !message.data) return { error: "Tell us what you'd like changed." };

  const [quotation] = await db
    .select({ id: quotations.id, orgId: quotations.orgId, number: quotations.number, contactName: quotations.contactName })
    .from(quotations)
    .where(and(eq(quotations.publicToken, token), inArray(quotations.status, ["draft", "sent"])))
    .limit(1);
  if (!quotation) return { error: "This quotation can no longer be responded to." };

  await db
    .update(quotations)
    .set({
      ...(response === "accept" ? { status: "accepted" as const } : {}),
      respondedAt: new Date(),
      customerResponse: message.data || null,
      updatedAt: new Date(),
    })
    .where(eq(quotations.id, quotation.id));

  const [owner] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.orgId, quotation.orgId), eq(profiles.role, "owner")))
    .limit(1);
  if (owner) {
    await notify({
      orgId: quotation.orgId,
      profileId: owner.id,
      kind: "system",
      title:
        response === "accept"
          ? `${quotation.contactName} accepted ${quotation.number}`
          : `${quotation.contactName} asked for changes to ${quotation.number}`,
      body: message.data || "No message.",
      link: `/quotations/${quotation.id}`,
    });
  }

  revalidatePath(`/quote/${token}`);
  return { error: null, done: response === "accept" ? "accepted" : "changes" };
}
