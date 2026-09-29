import { createHmac, timingSafeEqual } from "node:crypto";

// Meta signs webhook bodies as "sha256=<hex HMAC of raw body with app secret>".
export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header.slice("sha256=".length));
  return a.length === b.length && timingSafeEqual(a, b);
}

export type InboundMessage = { phoneNumberId: string; from: string; name: string | null; text: string; id: string };
export type StatusUpdate = { providerMessageId: string; status: "sent" | "delivered" | "read" | "failed"; error: string | null };

type Change = {
  value?: {
    metadata?: { phone_number_id?: string };
    contacts?: { wa_id?: string; profile?: { name?: string } }[];
    messages?: { id?: string; from?: string; type?: string; text?: { body?: string }; button?: { text?: string } }[];
    statuses?: { id?: string; status?: string; errors?: { title?: string; message?: string }[] }[];
  };
};

// Flattens Meta's nested entry[].changes[].value payload.
export function parseWhatsAppWebhook(payload: unknown): { messages: InboundMessage[]; statuses: StatusUpdate[] } {
  const messages: InboundMessage[] = [];
  const statuses: StatusUpdate[] = [];
  const entries = (payload as { entry?: { changes?: Change[] }[] } | null)?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!value || !phoneNumberId) continue;
      for (const m of value.messages ?? []) {
        if (!m.from || !m.id) continue;
        const contact = value.contacts?.find((c) => c.wa_id === m.from);
        const text = m.text?.body ?? m.button?.text ?? `[${m.type ?? "message"}]`;
        messages.push({ phoneNumberId, from: `+${m.from}`, name: contact?.profile?.name ?? null, text, id: m.id });
      }
      for (const s of value.statuses ?? []) {
        if (!s.id || !["sent", "delivered", "read", "failed"].includes(s.status ?? "")) continue;
        const err = s.errors?.[0];
        statuses.push({
          providerMessageId: s.id,
          status: s.status as StatusUpdate["status"],
          error: err ? (err.message ?? err.title ?? "failed") : null,
        });
      }
    }
  }
  return { messages, statuses };
}

// Last 10 digits — enough to match "+91 98xxx", "098xxx" and "98xxx" forms.
export function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}
