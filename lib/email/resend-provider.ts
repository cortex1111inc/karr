import "server-only";
import type { EmailContent, EmailProvider, EmailSendResult } from "./types";

// Resend (https://resend.com/docs/api-reference/emails/send-email). The
// from-address's domain must be verified in the Resend dashboard.
export class ResendProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(email: EmailContent): Promise<EmailSendResult> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) return { ok: false, error: data?.message ?? `Resend API error (${response.status})` };
    return { ok: true, providerMessageId: data?.id ?? "unknown" };
  }
}
