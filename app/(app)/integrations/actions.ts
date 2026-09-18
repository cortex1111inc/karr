"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";

const whatsappSchema = z.object({
  phoneNumberId: z.string().trim().min(1, "Phone Number ID is required"),
  accessToken: z.string().trim().optional(),
});

export async function saveWhatsAppIntegration(_prevState: { error: string | null }, formData: FormData) {
  const user = await requireUser();

  if (user.role !== "owner") {
    return { error: "Only the workspace owner can manage integrations." };
  }

  const parsed = whatsappSchema.safeParse({
    phoneNumberId: formData.get("phoneNumberId"),
    accessToken: formData.get("accessToken"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const [existing] = await db
    .select({ accessTokenEncrypted: integrations.accessTokenEncrypted })
    .from(integrations)
    .where(and(eq(integrations.orgId, user.orgId), eq(integrations.provider, "whatsapp")))
    .limit(1);

  // Blank token field means "keep the one already saved" — the form never
  // shows the real token back, so an empty submit shouldn't erase it.
  const accessTokenEncrypted = parsed.data.accessToken
    ? encryptSecret(parsed.data.accessToken)
    : existing?.accessTokenEncrypted;

  if (!accessTokenEncrypted) {
    return { error: "Access Token is required." };
  }

  await db
    .insert(integrations)
    .values({
      orgId: user.orgId,
      provider: "whatsapp",
      phoneNumberId: parsed.data.phoneNumberId,
      accessTokenEncrypted,
      connectedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [integrations.orgId, integrations.provider],
      set: {
        phoneNumberId: parsed.data.phoneNumberId,
        accessTokenEncrypted,
        connectedAt: new Date(),
        updatedAt: new Date(),
      },
    });

  revalidatePath("/integrations");
  return { error: null };
}

export async function disconnectWhatsAppIntegration() {
  const user = await requireUser();

  if (user.role !== "owner") return;

  await db.delete(integrations).where(and(eq(integrations.orgId, user.orgId), eq(integrations.provider, "whatsapp")));

  revalidatePath("/integrations");
}
