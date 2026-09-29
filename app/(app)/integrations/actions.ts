"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { integrations, profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { getIntegration, type IntegrationProvider, type WhatsAppSettings } from "@/lib/integrations";
import { sendWhatsApp, TEMPLATE_KINDS } from "@/lib/whatsapp";

type State = { error: string | null };

const OWNER_ONLY = { error: "Only the workspace owner can manage integrations." };
const NO_KEY = { error: "Integrations aren't configured on this server yet (missing INTEGRATIONS_ENCRYPTION_KEY)." };

// Blank secret fields mean "keep the one already saved" — the form never
// shows saved secrets back, so an empty submit mustn't erase them.
function encryptOrKeep(value: string | undefined, existing: string | null | undefined): string | null | undefined {
  return value ? encryptSecret(value) : existing;
}

async function upsert(
  orgId: string,
  provider: IntegrationProvider,
  values: {
    phoneNumberId?: string | null;
    accessTokenEncrypted: string;
    secondarySecretEncrypted?: string | null;
    settings: Record<string, unknown>;
  },
) {
  const now = new Date();
  await db
    .insert(integrations)
    .values({ orgId, provider, ...values, connectedAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [integrations.orgId, integrations.provider],
      set: { ...values, connectedAt: now, updatedAt: now },
    });
  revalidatePath("/integrations");
}

// ── WhatsApp ────────────────────────────────────────────────────────────

const whatsappSchema = z.object({
  phoneNumberId: z.string().trim().min(1, "Phone Number ID is required").max(64),
  accessToken: z.string().trim().max(1000).optional(),
});

export async function saveWhatsAppIntegration(_prev: State, formData: FormData): Promise<State> {
  const user = await requireUser();
  if (user.role !== "owner") return OWNER_ONLY;

  const parsed = whatsappSchema.safeParse({
    phoneNumberId: formData.get("phoneNumberId"),
    accessToken: formData.get("accessToken") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  const existing = await getIntegration(user.orgId, "whatsapp");
  let accessTokenEncrypted;
  try {
    accessTokenEncrypted = encryptOrKeep(parsed.data.accessToken, existing?.accessTokenEncrypted);
  } catch {
    return NO_KEY;
  }
  if (!accessTokenEncrypted) return { error: "Access Token is required." };

  await upsert(user.orgId, "whatsapp", {
    phoneNumberId: parsed.data.phoneNumberId,
    accessTokenEncrypted,
    settings: existing?.settings ?? {},
  });
  return { error: null };
}

// Template names per message kind (approved in Meta Business Suite).
export async function saveWhatsAppTemplates(_prev: State, formData: FormData): Promise<State> {
  const user = await requireUser();
  if (user.role !== "owner") return OWNER_ONLY;

  const existing = await getIntegration(user.orgId, "whatsapp");
  if (!existing?.accessTokenEncrypted) return { error: "Connect WhatsApp first." };

  const nameRe = /^[a-z0-9_]{1,512}$/;
  const templates: NonNullable<WhatsAppSettings["templates"]> = {};
  for (const t of TEMPLATE_KINDS) {
    const name = String(formData.get(`template_${t.kind}`) ?? "").trim();
    const language = String(formData.get(`language_${t.kind}`) ?? "").trim() || "en";
    if (!name) continue;
    if (!nameRe.test(name)) return { error: `Template names use lowercase letters, numbers and underscores (${t.label}).` };
    if (!/^[a-z]{2,3}(_[A-Z]{2})?$/.test(language)) return { error: `Language looks wrong for ${t.label} — use e.g. en or en_US.` };
    templates[t.kind] = { name, language };
  }

  await db
    .update(integrations)
    .set({ settings: { ...(existing.settings ?? {}), templates }, updatedAt: new Date() })
    .where(eq(integrations.id, existing.id));
  revalidatePath("/integrations");
  return { error: null };
}

async function ownerPhone(userId: string) {
  const [row] = await db.select({ phone: profiles.phone }).from(profiles).where(eq(profiles.id, userId)).limit(1);
  return row?.phone ?? null;
}

export async function sendWhatsAppTest(): Promise<State> {
  const user = await requireUser();
  if (user.role !== "owner") return OWNER_ONLY;
  const phone = await ownerPhone(user.id);
  if (!phone) return { error: "Add your phone number on Settings → Your account first." };

  const result = await sendWhatsApp({
    orgId: user.orgId,
    to: phone,
    kind: "manual",
    body: "Test message from Vanspire OS — your WhatsApp connection works.",
  });
  return { error: result.ok ? null : `WhatsApp said: ${result.error}` };
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

  await upsert(user.orgId, "email", { accessTokenEncrypted, settings: { fromAddress: parsed.data.fromAddress } });
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

  await upsert(user.orgId, "razorpay", {
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
  if (!["whatsapp", "email", "razorpay"].includes(provider)) return;
  await db.delete(integrations).where(and(eq(integrations.orgId, user.orgId), eq(integrations.provider, provider)));
  revalidatePath("/integrations");
}
