import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { integrations, whatsappMessageKindEnum, whatsappMessages } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { CloudApiProvider } from "./cloud-provider";
import { ConsoleProvider } from "./console-provider";
import type { WhatsAppProvider } from "./types";

// Resolution order: this org's own credentials (saved via the Integrations
// page) → shared env-var fallback → console logging. Per-org credentials
// let each business connect their own WhatsApp Business account without
// anyone touching code or Vercel settings.
async function getProvider(orgId: string): Promise<WhatsAppProvider> {
  const [connected] = await db
    .select({ phoneNumberId: integrations.phoneNumberId, accessTokenEncrypted: integrations.accessTokenEncrypted })
    .from(integrations)
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, "whatsapp")))
    .limit(1);

  if (connected?.phoneNumberId && connected.accessTokenEncrypted) {
    return new CloudApiProvider(connected.phoneNumberId, decryptSecret(connected.accessTokenEncrypted));
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (phoneNumberId && accessToken) {
    return new CloudApiProvider(phoneNumberId, accessToken);
  }

  return new ConsoleProvider();
}

export type SendWhatsAppInput = {
  orgId: string;
  to: string;
  body: string;
  kind: (typeof whatsappMessageKindEnum.enumValues)[number];
  customerId?: string;
  leadId?: string;
  campaignId?: string;
};

// Sends via whichever provider is configured (or logs to console in dev)
// and always writes an audit row to `whatsapp_messages`, so retention
// activity is visible in the app either way.
export async function sendWhatsApp(input: SendWhatsAppInput) {
  const provider = await getProvider(input.orgId);
  const result = await provider.send(input.to, input.body);

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
