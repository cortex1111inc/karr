import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { invoiceItems, invoices, organizations } from "@/db/schema";
import { formatCurrency } from "@/lib/billing/money";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getIntegration } from "@/lib/integrations";
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
    db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, invoice.orgId)).limit(1),
    db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id)).orderBy(asc(invoiceItems.sortOrder)),
    getIntegration(invoice.orgId, "razorpay"),
  ]);

  const balanceDue = Math.max(0, Number(invoice.total) - Number(invoice.amountPaid));
  const canPayOnline =
    Boolean(razorpay?.connectedAt) && balanceDue > 0 && (invoice.status === "sent" || invoice.status === "partial");

  return (
    <main className="flex min-h-full flex-1 justify-center bg-surface-2 px-6 py-16">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-faint">{org[0]?.name}</p>
            <h1 className="font-display text-xl font-bold">Invoice {invoice.number}</h1>
          </div>
          <Badge tone={invoice.status === "paid" || invoice.status === "partial" ? "accent" : invoice.status === "void" ? "danger" : "neutral"}>
            {invoice.status}
          </Badge>
        </div>

        <Card className="p-6">
          <div>
            <p className="text-sm font-semibold">{invoice.contactName}</p>
            <p className="text-xs text-muted">{invoice.contactPhone}</p>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left">
                  <th className="p-2.5 font-medium text-faint">Description</th>
                  <th className="p-2.5 font-medium text-faint">Qty</th>
                  <th className="p-2.5 text-right font-medium text-faint">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="p-2.5">{item.description}</td>
                    <td className="p-2.5 font-mono tabular-nums">{item.quantity}</td>
                    <td className="p-2.5 text-right font-mono tabular-nums">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="mt-4 ml-auto flex max-w-[220px] flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-mono tabular-nums">{formatCurrency(invoice.subtotal)}</dd>
            </div>
            {invoice.gstEnabled ? (
              <div className="flex justify-between">
                <dt className="text-muted">GST ({invoice.gstRate}%)</dt>
                <dd className="font-mono tabular-nums">{formatCurrency(invoice.taxAmount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
              <dt>Total</dt>
              <dd className="font-mono tabular-nums">{formatCurrency(invoice.total)}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-muted">Paid</dt>
              <dd className="font-mono tabular-nums text-accent-deep">{formatCurrency(invoice.amountPaid)}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-muted">Balance due</dt>
              <dd className="font-mono tabular-nums">{formatCurrency(balanceDue)}</dd>
            </div>
          </dl>

          {invoice.notes ? (
            <p className="mt-4 border-t border-border pt-3 text-sm text-muted">{invoice.notes}</p>
          ) : null}

          {paid ? (
            <p role="status" className="mt-5 rounded-lg bg-accent-soft px-3 py-2 text-center text-sm text-accent-deep">
              Thanks — your payment is being confirmed. This page updates once it&apos;s received.
            </p>
          ) : canPayOnline ? (
            <PayButton token={token} balance={balanceDue} />
          ) : null}
        </Card>
      </div>
    </main>
  );
}
