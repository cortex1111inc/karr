import { createHmac, timingSafeEqual } from "node:crypto";

// Razorpay Payment Links: https://razorpay.com/docs/api/payments/payment-links/
export type RazorpayCredentials = { keyId: string; keySecret: string };

export async function createPaymentLink(
  creds: RazorpayCredentials,
  input: {
    amount: number; // rupees
    description: string;
    referenceId: string;
    customerName: string;
    customerPhone: string;
    callbackUrl: string;
    invoiceId: string;
  },
): Promise<{ ok: true; id: string; url: string } | { ok: false; error: string }> {
  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(input.amount * 100),
      currency: "INR",
      description: input.description.slice(0, 2048),
      // Razorpay requires reference_id to be unique per link.
      reference_id: `${input.referenceId}-${Date.now().toString(36)}`.slice(0, 40),
      customer: { name: input.customerName, contact: input.customerPhone.replace(/[^\d+]/g, "") },
      notify: { sms: false, email: false },
      callback_url: input.callbackUrl,
      callback_method: "get",
      notes: { invoice_id: input.invoiceId },
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) return { ok: false, error: data?.error?.description ?? `Razorpay error (${response.status})` };
  return { ok: true, id: data.id, url: data.short_url };
}

// X-Razorpay-Signature is hex HMAC-SHA256 of the raw body with the webhook secret.
export function verifyRazorpaySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function mapRazorpayMethod(method: string | undefined): "upi" | "card" | "bank_transfer" | "other" {
  switch (method) {
    case "upi":
      return "upi";
    case "card":
    case "emi":
      return "card";
    case "netbanking":
      return "bank_transfer";
    default:
      return "other";
  }
}
