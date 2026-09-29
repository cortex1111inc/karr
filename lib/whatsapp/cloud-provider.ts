import "server-only";
import type { WhatsAppProvider, WhatsAppSendResult } from "./types";

// WhatsApp Cloud API (Meta) — the official, no-BSP-middleman option.
// Setup: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
// Needs WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN in the environment.
//
// Free-form text only reaches customers inside Meta's 24-hour window; cold
// outreach (reminders, campaigns) goes through sendTemplate() when the org
// has mapped that message kind to an approved template (lib/whatsapp/index.ts).
export class CloudApiProvider implements WhatsAppProvider {
  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken: string,
  ) {}

  send(to: string, body: string): Promise<WhatsAppSendResult> {
    return this.post({ messaging_product: "whatsapp", to: normalizePhone(to), type: "text", text: { body } });
  }

  sendTemplate(to: string, name: string, language: string, params: string[]): Promise<WhatsAppSendResult> {
    return this.post({
      messaging_product: "whatsapp",
      to: normalizePhone(to),
      type: "template",
      template: {
        name,
        language: { code: language },
        components: params.length
          ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }]
          : [],
      },
    });
  }

  private async post(payload: unknown): Promise<WhatsAppSendResult> {
    const response = await fetch(`https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
