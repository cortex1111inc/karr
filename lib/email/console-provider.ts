import "server-only";
import type { EmailContent, EmailProvider, EmailSendResult } from "./types";

// Default when no email provider is connected — every email feature still
// runs end-to-end and is logged to email_messages.
export class ConsoleEmailProvider implements EmailProvider {
  async send(email: EmailContent): Promise<EmailSendResult> {
    console.log(`[email:console] → ${email.to}\nSubject: ${email.subject}\n${email.text}`);
    return { ok: true, providerMessageId: `console-${Date.now()}` };
  }
}
