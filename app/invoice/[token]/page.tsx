import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { invoiceItems, invoices } from "@/db/schema";
import { formatCurrency } from "@/lib/billing/money";
import { documentOrg } from "@/lib/billing/document-org";
import { getIntegration } from "@/lib/integrations";
import { DocumentView } from "@/components/billing/document-view";
import { PayButton } from "./pay-button";

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { token } = await params;
  const { paid } = await searchParams;

  const [invoice] = await db.select().from(invoices).where(eq(invoices.publicToken, token)).limit(1);
  if (!invoice) notFound();

  const [org, items, razorpay] = await Promise.all([
    documentOrg(invoice.orgId),
    db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id)).orderBy(asc(invoiceItems.sortOrder)),
    getIntegration(invoice.orgId, "razorpay"),
  ]);

  const balanceDue = Math.max(0, Number(invoice.total) - Number(invoice.amountPaid));
  const canPayOnline =
    Boolean(razorpay?.connectedAt) && balanceDue > 0 && (invoice.status === "sent" || invoice.status === "partial");

  return (
    <DocumentView
      org={org}
      doc={{
        ...invoice,
        kind: invoice.gstEnabled && org.gstin ? "Tax invoice" : "Invoice",
        statusTone: invoice.status === "paid" || invoice.status === "partial" ? "accent" : invoice.status === "void" ? "danger" : "neutral",
        items,
      }}
      extraTotals={
        <>
          <div className="flex justify-between gap-6">
            <dt className="text-muted">Paid</dt>
            <dd className="font-mono tabular-nums text-accent-deep">{formatCurrency(invoice.amountPaid)}</dd>
          </div>
          <div className="flex justify-between gap-6 font-medium">
            <dt>Balance due</dt>
            <dd className="font-mono tabular-nums">{formatCurrency(balanceDue)}</dd>
          </div>
        </>
      }
    >
      {paid ? (
        <p role="status" className="mt-5 rounded-lg bg-accent-soft px-3 py-2 text-center text-sm text-accent-deep">
          Thanks — your payment is being confirmed. This page updates once it&apos;s received.
        </p>
      ) : canPayOnline ? (
        <PayButton token={token} balance={balanceDue} />
      ) : null}
    </DocumentView>
  );
}
