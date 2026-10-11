"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { encryptSecret } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { getIntegration, type IntegrationProvider } from "@/lib/integrations";

type State = { error: string | null };

const OWNER_ONLY = { error: "Only the workspace owner can manage integrations." };
const NO_KEY = { error: "Integrations aren't configured on this server yet (missing INTEGRATIONS_ENCRYPTION_KEY)." };

// Blank secret fields mean "keep the one already saved" — the form never
// shows saved secrets back, so an empty submit mustn't erase them.
function encryptOrKeep(value: string | undefined, existing: string | null | undefined): string | null | undefined {
  return value ? encryptSecret(value) : existing;
}

async function upsert(
  user: CurrentUser,
  provider: IntegrationProvider,
  values: {
    accessTokenEncrypted: string;
    secondarySecretEncrypted?: string | null;
    settings: Record<string, unknown>;
  },
) {
  const now = new Date();
  const orgId = user.orgId;
  await db
    .insert(integrations)
    .values({ orgId, provider, ...values, connectedAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [integrations.orgId, integrations.provider],
      set: { ...values, connectedAt: now, updatedAt: now },
    });
  await audit(user, { action: "integration.save", targetType: "integration", targetId: provider, summary: `Saved ${provider} credentials` });
  revalidatePath("/integrations");
}

// ── Email (Resend) ──────────────────────────────────────────────────────

const emailSchema = z.object({
  fromAddress: z
    .string()
    .trim()
    .min(3, "From address is required")
    .max(200)
    .regex(/^([^<>]+<)?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>?$/, "Use an address like bookings@yourdomain.com or Name <bookings@yourdomain.com>"),
  apiKey: z.string().trim().max(500).optional(),
});

export async function saveEmailIntegration(_prev: State, formData: FormData): Promise<State> {
  const user = await requireUser();
  if (user.role !== "owner") return OWNER_ONLY;

  const parsed = emailSchema.safeParse({ fromAddress: formData.get("fromAddress"), apiKey: formData.get("apiKey") || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  const existing = await getIntegration(user.orgId, "email");
  let accessTokenEncrypted;
  try {
    accessTokenEncrypted = encryptOrKeep(parsed.data.apiKey, existing?.accessTokenEncrypted);
  } catch {
    return NO_KEY;
  }
  if (!accessTokenEncrypted) return { error: "API key is required." };

  await upsert(user, "email", { accessTokenEncrypted, settings: { fromAddress: parsed.data.fromAddress } });
  return { error: null };
}

export async function sendEmailTest(): Promise<State> {
  const user = await requireUser();
  if (user.role !== "owner") return OWNER_ONLY;
  const result = await sendEmail({
    orgId: user.orgId,
    kind: "test",
    to: user.email,
    subject: "Vanspire OS test email",
    text: "Your email connection works.",
  });
  return { error: result.ok ? null : `Email provider said: ${result.error}` };
}

// ── Payments (Razorpay) ─────────────────────────────────────────────────

const razorpaySchema = z.object({
  keyId: z.string().trim().regex(/^rzp_(test|live)_[A-Za-z0-9]+$/, "Key ID starts with rzp_test_ or rzp_live_"),
  keySecret: z.string().trim().max(200).optional(),
  webhookSecret: z.string().trim().max(200).optional(),
});

export async function saveRazorpayIntegration(_prev: State, formData: FormData): Promise<State> {
  const user = await requireUser();
  if (user.role !== "owner") return OWNER_ONLY;

  const parsed = razorpaySchema.safeParse({
    keyId: formData.get("keyId"),
    keySecret: formData.get("keySecret") || undefined,
    webhookSecret: formData.get("webhookSecret") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  const existing = await getIntegration(user.orgId, "razorpay");
  let accessTokenEncrypted, secondarySecretEncrypted;
  try {
    accessTokenEncrypted = encryptOrKeep(parsed.data.keySecret, existing?.accessTokenEncrypted);
    secondarySecretEncrypted = encryptOrKeep(parsed.data.webhookSecret, existing?.secondarySecretEncrypted);
  } catch {
    return NO_KEY;
  }
  if (!accessTokenEncrypted) return { error: "Key secret is required." };
  if (!secondarySecretEncrypted) return { error: "Webhook secret is required — payments can't be confirmed without it." };

  await upsert(user, "razorpay", {
    accessTokenEncrypted,
    secondarySecretEncrypted,
    settings: { keyId: parsed.data.keyId },
  });
  return { error: null };
}

// ── Shared ──────────────────────────────────────────────────────────────

export async function disconnectIntegration(provider: IntegrationProvider) {
  const user = await requireUser();
  if (user.role !== "owner") return;
  if (!["email", "razorpay"].includes(provider)) return;
  await db.delete(integrations).where(and(eq(integrations.orgId, user.orgId), eq(integrations.provider, provider)));
  await audit(user, { action: "integration.disconnect", targetType: "integration", targetId: provider, summary: `Disconnected ${provider}` });
  revalidatePath("/integrations");
}
