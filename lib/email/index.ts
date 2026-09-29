import "server-only";
import { db } from "@/db";
import { emailMessages } from "@/db/schema";
import { getIntegration, tryDecrypt, type EmailSettings } from "@/lib/integrations";
import { ConsoleEmailProvider } from "./console-provider";
import { ResendProvider } from "./resend-provider";
import type { EmailContent, EmailProvider, EmailSendResult } from "./types";

// Same resolution order as WhatsApp: org's own Resend key → shared env
// (RESEND_API_KEY + EMAIL_FROM) → console.
async function getProvider(orgId: string): Promise<EmailProvider> {
  const row = await getIntegration(orgId, "email");
  const apiKey = tryDecrypt(row?.accessTokenEncrypted);
  const from = (row?.settings as EmailSettings | undefined)?.fromAddress;
  if (apiKey && from) return new ResendProvider(apiKey, from);

  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    return new ResendProvider(process.env.RESEND_API_KEY, process.env.EMAIL_FROM);
  }
  return new ConsoleEmailProvider();
}

// Never throws; always writes an email_messages audit row.
export async function sendEmail(input: EmailContent & { orgId: string; kind: string }): Promise<EmailSendResult> {
  let result: EmailSendResult;
  try {
    const provider = await getProvider(input.orgId);
    result = await provider.send(input);
  } catch (error) {
    result = { ok: false, error: error instanceof Error ? error.message : "Unknown email send error" };
  }

  await db.insert(emailMessages).values({
    orgId: input.orgId,
    kind: input.kind,
    toEmail: input.to,
    subject: input.subject,
    status: result.ok ? "sent" : "failed",
    providerMessageId: result.ok ? result.providerMessageId : null,
    error: result.ok ? null : result.error,
  });
  return result;
}
