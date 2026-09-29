"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { invoices, organizations } from "@/db/schema";
import { getIntegration, tryDecrypt, type RazorpaySettings } from "@/lib/integrations";
import { createPaymentLink } from "@/lib/payments/razorpay";
import { clientKey, consumeRateLimit } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site";

// Public, keyed on the invoice token only. Reuses the stored payment link
// while the balance is unchanged, otherwise creates one for the new balance.
export async function startOnlinePayment(token: string): Promise<{ error: string | null }> {
  if (!(await consumeRateLimit(await clientKey(`pay:${token}`), 10, 600))) {
    return { error: "Too many attempts — try again in a few minutes." };
  }

  const [invoice] = await db.select().from(invoices).where(eq(invoices.publicToken, token)).limit(1);
  if (!invoice || (invoice.status !== "sent" && invoice.status !== "partial")) {
    return { error: "This invoice can't be paid online." };
  }
  const balance = Math.round((Number(invoice.total) - Number(invoice.amountPaid)) * 100) / 100;
  if (balance <= 0) return { error: "Nothing is due on this invoice." };

  if (invoice.paymentLinkUrl && Number(invoice.paymentLinkAmount) === balance) {
    redirect(invoice.paymentLinkUrl);
  }

  const integration = await getIntegration(invoice.orgId, "razorpay");
  const keyId = (integration?.settings as RazorpaySettings | undefined)?.keyId;
  const keySecret = tryDecrypt(integration?.accessTokenEncrypted);
  if (!keyId || !keySecret) return { error: "Online payment isn't set up for this business." };

  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, invoice.orgId)).limit(1);
  const link = await createPaymentLink(
    { keyId, keySecret },
    {
      amount: balance,
      description: `${org?.name ?? "Invoice"} — ${invoice.number}`,
      referenceId: invoice.number,
      customerName: invoice.contactName,
      customerPhone: invoice.contactPhone,
      callbackUrl: `${getSiteUrl()}/invoice/${token}?paid=1`,
      invoiceId: invoice.id,
    },
  );
  if (!link.ok) {
    console.error("[razorpay] payment link failed", link.error);
    return { error: "Couldn't start the payment — please try again or pay the business directly." };
  }

  await db
    .update(invoices)
    .set({ paymentLinkId: link.id, paymentLinkUrl: link.url, paymentLinkAmount: balance.toFixed(2) })
    .where(eq(invoices.id, invoice.id));
  redirect(link.url);
}
