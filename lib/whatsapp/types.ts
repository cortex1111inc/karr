export type WhatsAppSendResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; error: string };

export interface WhatsAppProvider {
  send(to: string, body: string): Promise<WhatsAppSendResult>;
}
