export type WhatsAppSendResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; error: string };

export interface WhatsAppProvider {
  send(to: string, body: string): Promise<WhatsAppSendResult>;
  // Business-initiated messages outside Meta's 24h window must use an
  // approved template; params fill its {{1}}, {{2}}… body variables.
  sendTemplate(to: string, name: string, language: string, params: string[]): Promise<WhatsAppSendResult>;
}
