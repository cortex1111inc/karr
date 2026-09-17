import "server-only";
import type { WhatsAppProvider, WhatsAppSendResult } from "./types";

// Default when WHATSAPP_PHONE_NUMBER_ID/WHATSAPP_ACCESS_TOKEN aren't set —
// lets every retention feature (booking confirmations, reminders,
// campaigns) run and be tested end-to-end without a live WhatsApp account.
// The message still gets logged to `whatsapp_messages` either way.
export class ConsoleProvider implements WhatsAppProvider {
  async send(to: string, body: string): Promise<WhatsAppSendResult> {
    console.log(`[whatsapp:console] → ${to}\n${body}`);
    return { ok: true, providerMessageId: `console-${Date.now()}` };
  }
}
