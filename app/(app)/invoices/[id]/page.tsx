import { and, asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { invoiceItems, invoices, payments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site";
import { formatCurrency } from "@/lib/billing/money";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { DeleteInvoiceButton, InvoiceStatusSelect } from "./invoice-actions";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { DeletePaymentButton } from "./delete-payment-button";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  other: "Other",
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.orgId, user.orgId)))
    .limit(1);

  if (!invoice) notFound();

  const [items, paymentRows] = await Promise.all([
    db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id)).orderBy(asc(invoiceItems.sortOrder)),
    db.select().from(payments).where(eq(payments.invoiceId, id)).orderBy(desc(payments.paidAt)),
  ]);

  const balanceDue = Math.max(0, Number(invoice.total) - Number(invoice.amountPaid));
  const publicUrl = `${getSiteUrl()}/invoice/${invoice.publicToken}`;
  const isAutoStatus = invoice.status === "paid" || invoice.status === "partial";

  return (
    <>
      <PageHeader
        title={invoice.number}
        description={
          <Link href="/invoices" className="text-sm text-muted hover:text-foreground">
            ← Back to invoices
          </Link>
        }
        action={
          <div className="flex items-center gap-2">
            {isAutoStatus ? (
              <Badge tone="accent">{invoice.status}</Badge>
            ) : (
              <InvoiceStatusSelect invoiceId={invoice.id} status={invoice.status} />
            )}
            {invoice.status !== "void" && balanceDue > 0 ? (
              <RecordPaymentDialog invoiceId={invoice.id} balanceDue={balanceDue} />
            ) : null}
          </div>
        }
      />
      <div className="flex-1 px-8 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <div className="flex flex-col gap-6">
            <Card className="p-5">
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
                      <th className="p-2.5 font-medium text-faint">Unit price</th>
                      <th className="p-2.5 text-right font-medium text-faint">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-0">
                        <td className="p-2.5">{item.description}</td>
                        <td className="p-2.5 font-mono tabular-nums">{item.quantity}</td>
                        <td className="p-2.5 font-mono tabular-nums">{formatCurrency(item.unitPrice)}</td>
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
            </Card>

            <Card className="p-5">
              <h2 className="font-display text-sm font-bold">Payments</h2>
              <div className="mt-3 flex flex-col gap-3">
                {paymentRows.length === 0 ? (
                  <p className="text-sm text-faint">No payments recorded yet.</p>
                ) : (
                  paymentRows.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium">
                          {formatCurrency(payment.amount)}{" "}
                          <span className="font-normal text-faint">via {METHOD_LABEL[payment.method]}</span>
                        </p>
                        <p className="text-xs text-faint">{payment.paidAt.toLocaleString()}</p>
                        {payment.notes ? <p className="mt-0.5 text-xs text-muted">{payment.notes}</p> : null}
                      </div>
                      <DeletePaymentButton paymentId={payment.id} invoiceId={invoice.id} />
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card className="p-5">
              <h2 className="font-display text-sm font-bold">Share</h2>
              <p className="mt-0.5 text-sm text-muted">Send this link to the customer — no login needed.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs">{publicUrl}</code>
                <CopyLinkButton url={publicUrl} />
              </div>
            </Card>

            {invoice.status === "draft" ? (
              <Card className="p-5">
                <DeleteInvoiceButton invoiceId={invoice.id} />
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
