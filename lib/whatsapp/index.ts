import "server-only";
import { db } from "@/db";
import { whatsappMessageKindEnum, whatsappMessages } from "@/db/schema";
import { CloudApiProvider } from "./cloud-provider";
import { ConsoleProvider } from "./console-provider";
import type { WhatsAppProvider } from "./types";

function getProvider(): WhatsAppProvider {
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
  const provider = getProvider();
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
