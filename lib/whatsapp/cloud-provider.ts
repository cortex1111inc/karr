import "server-only";
import type { WhatsAppProvider, WhatsAppSendResult } from "./types";

// WhatsApp Cloud API (Meta) — the official, no-BSP-middleman option.
// Setup: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
// Needs WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN in the environment.
//
// Note: outside Meta's 24-hour customer-service window, messages must use a
// pre-approved template (not free-form text) or they'll be rejected. This
// sends free-form text — fine for replies within 24h of the customer's last
// message; for the service-reminder cron (which reaches out cold) you'll
// need to create and reference an approved template instead.
export class CloudApiProvider implements WhatsAppProvider {
  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken: string,
  ) {}

  async send(to: string, body: string): Promise<WhatsAppSendResult> {
    const response = await fetch(`https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhone(to),
        type: "text",
        text: { body },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: data?.error?.message ?? `WhatsApp API error (${response.status})` };
    }

    return { ok: true, providerMessageId: data?.messages?.[0]?.id ?? "unknown" };
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}
