import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, profiles } from "@/db/schema";
import { applyPayment } from "@/lib/billing/payments";
import { formatCurrency } from "@/lib/billing/money";
import { getIntegration, tryDecrypt } from "@/lib/integrations";
import { notify } from "@/lib/notifications";
import { mapRazorpayMethod, verifyRazorpaySignature } from "@/lib/payments/razorpay";

// Razorpay webhook, one URL per org (shown on /integrations) so the right
// webhook secret can be picked before trusting anything in the body. The
// signature is the only auth; payments are idempotent on the Razorpay
// payment id, so redeliveries are harmless.
type LinkPaidPayload = {
  event?: string;
  payload?: {
    payment_link?: { entity?: { id?: string; notes?: { invoice_id?: string } } };
    payment?: { entity?: { id?: string; amount?: number; method?: string; status?: string } };
  };
};

const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!UUID.test(orgId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const integration = await getIntegration(orgId, "razorpay");
  const secret = tryDecrypt(integration?.secondarySecretEncrypted);
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 404 });

  const raw = await request.text();
  if (!verifyRazorpaySignature(raw, request.headers.get("x-razorpay-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: LinkPaidPayload;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  if (body.event !== "payment_link.paid") return NextResponse.json({ ok: true, ignored: body.event });

  const linkId = body.payload?.payment_link?.entity?.id;
  const payment = body.payload?.payment?.entity;
  if (!linkId || !payment?.id || !payment.amount) return NextResponse.json({ error: "Missing payment" }, { status: 400 });

  // Resolve the invoice by our stored link id (scoped to this org) rather
  // than trusting notes alone.
  const [invoice] = await db
    .select({ id: invoices.id, number: invoices.number, contactName: invoices.contactName })
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId), eq(invoices.paymentLinkId, linkId)))
    .limit(1);
  if (!invoice) return NextResponse.json({ ok: true, ignored: "unknown link" });

  const amount = payment.amount / 100;
  const result = await applyPayment({
    orgId,
    invoiceId: invoice.id,
    amount,
    method: mapRazorpayMethod(payment.method),
    notes: `Paid online via Razorpay (${payment.id})`,
    providerPaymentId: payment.id,
    online: true,
  });
  if (!result.ok) return NextResponse.json({ ok: true, ignored: result.error });

  if (!result.duplicate) {
    const [owner] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.orgId, orgId), eq(profiles.role, "owner")))
      .limit(1);
    if (owner) {
      await notify({
        orgId,
        profileId: owner.id,
        kind: "system",
        title: `${formatCurrency(amount)} received on ${invoice.number}`,
        body: `${invoice.contactName} paid online.`,
        link: `/invoices/${invoice.id}`,
      });
    }
  }
  return NextResponse.json({ ok: true });
}
