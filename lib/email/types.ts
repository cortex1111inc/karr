export type EmailSendResult = { ok: true; providerMessageId: string } | { ok: false; error: string };

export type EmailContent = { to: string; subject: string; text: string; html?: string };

export interface EmailProvider {
  send(email: EmailContent): Promise<EmailSendResult>;
}
