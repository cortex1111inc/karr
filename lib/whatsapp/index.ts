import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { integrations, whatsappMessageKindEnum, whatsappMessages } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import type { WhatsAppSettings } from "@/lib/integrations";
import { CloudApiProvider } from "./cloud-provider";
import { ConsoleProvider } from "./console-provider";
import type { WhatsAppProvider, WhatsAppSendResult } from "./types";

// Resolution order: this org's own credentials (saved via the Integrations
// page) → shared env-var fallback → console logging. Per-org credentials
// let each business connect their own WhatsApp Business account without
// anyone touching code or Vercel settings.
async function getProvider(orgId: string): Promise<{ provider: WhatsAppProvider; settings: WhatsAppSettings }> {
  const [connected] = await db
    .select({
      phoneNumberId: integrations.phoneNumberId,
      accessTokenEncrypted: integrations.accessTokenEncrypted,
      settings: integrations.settings,
    })
    .from(integrations)
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, "whatsapp")))
    .limit(1);
  const settings = (connected?.settings ?? {}) as WhatsAppSettings;

  if (connected?.phoneNumberId && connected.accessTokenEncrypted) {
    // Decryption can fail if INTEGRATIONS_ENCRYPTION_KEY is missing/rotated
    // since this row was saved — fall through to the env-var/console path
    // rather than throwing, so a WhatsApp misconfiguration never blocks the
    // primary action (e.g. converting a lead) that triggered the send.
    try {
      return { provider: new CloudApiProvider(connected.phoneNumberId, decryptSecret(connected.accessTokenEncrypted)), settings };
    } catch {
      // fall through
    }
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (phoneNumberId && accessToken) {
    return { provider: new CloudApiProvider(phoneNumberId, accessToken), settings };
  }

  return { provider: new ConsoleProvider(), settings };
}

export type SendWhatsAppInput = {
  orgId: string;
  to: string;
  body: string;
  kind: (typeof whatsappMessageKindEnum.enumValues)[number];
  customerId?: string;
  leadId?: string;
  campaignId?: string;
  // Values for the approved template's {{1}}, {{2}}… when the org has mapped
  // this kind to one (see TEMPLATE_KINDS). `body` is still what gets logged.
  templateParams?: string[];
};

// Message kinds that are business-initiated (outside the 24h window), with
// the variables their template body receives, in order. Shown on
// /integrations so the owner knows what to submit to Meta for approval.
export const TEMPLATE_KINDS: { kind: SendWhatsAppInput["kind"]; label: string; variables: string[]; example: string }[] = [
  {
    kind: "service_reminder",
    label: "Service reminder",
    variables: ["customer name"],
    example: "Hi {{1}}, it's been a while since your last visit — reply to book your next service or rental.",
  },
  {
    kind: "invoice_reminder",
    label: "Unpaid invoice reminder",
    variables: ["customer name", "business name", "amount due", "invoice number", "invoice link"],
    example: "Hi {{1}}, a reminder from {{2}}: {{3}} is pending on invoice {{4}}. View and pay: {{5}}",
  },
  {
    kind: "campaign",
    label: "Campaign",
    variables: ["customer name"],
    example: "Hi {{1}}, we have a new offer for you — reply to know more.",
  },
  {
    kind: "vehicle_received",
    label: "Booking received",
    variables: ["customer name", "status link"],
    example: "Hi {{1}}, we've got your booking. Track it here: {{2}}",
  },
  {
    kind: "ready_for_pickup",
    label: "Ready for pickup",
    variables: ["customer name", "status link"],
    example: "Hi {{1}}, your vehicle is ready for pickup! Details: {{2}}",
  },
  {
    kind: "staff_alert",
    label: "Staff alert",
    variables: ["alert title", "alert details"],
    example: "Vanspire alert: {{1}} — {{2}}",
  },
];

// Sends via whichever provider is configured (or logs to console in dev)
// and always writes an audit row to `whatsapp_messages`, so retention
// activity is visible in the app either way. Never throws — a WhatsApp
// failure shouldn't take down the feature (lead conversion, campaign send,
// etc.) that triggered it; callers get {ok:false} back instead.
export async function sendWhatsApp(input: SendWhatsAppInput): Promise<WhatsAppSendResult> {
  let result: WhatsAppSendResult;
  try {
    const { provider, settings } = await getProvider(input.orgId);
    const template = settings.templates?.[input.kind];
    result =
      template?.name && input.templateParams
        ? await provider.sendTemplate(input.to, template.name, template.language || "en", input.templateParams)
        : await provider.send(input.to, input.body);
  } catch (error) {
    result = { ok: false, error: error instanceof Error ? error.message : "Unknown WhatsApp send error" };
  }

  await db.insert(whatsappMessages).values({
    orgId: input.orgId,
    customerId: input.customerId,
    leadId: input.leadId,
    campaignId: input.campaignId,
    kind: input.kind,
    toPhone: input.to,
    body: input.body,
    status: result.ok ? "sent" : "failed",
    providerMessageId: result.ok ? result.providerMessageId : null,
    error: result.ok ? null : result.error,
  });

  return result;
}
