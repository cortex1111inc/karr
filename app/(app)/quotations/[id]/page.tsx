import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { quotationItems, quotations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site";
import { formatCurrency } from "@/lib/billing/money";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { ConvertToInvoiceButton, DeleteQuotationButton, QuotationStatusSelect } from "./quotation-actions";

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const [quotation] = await db
    .select()
    .from(quotations)
    .where(and(eq(quotations.id, id), eq(quotations.orgId, user.orgId)))
    .limit(1);

  if (!quotation) notFound();

  const items = await db
    .select()
    .from(quotationItems)
    .where(eq(quotationItems.quotationId, id))
    .orderBy(asc(quotationItems.sortOrder));

  const publicUrl = `${getSiteUrl()}/quote/${quotation.publicToken}`;

  return (
    <>
      <PageHeader
        title={quotation.number}
        description={
          <Link href="/quotations" className="text-sm text-muted hover:text-foreground">
            ← Back to quotations
          </Link>
        }
        action={
          <div className="flex items-center gap-2">
            <QuotationStatusSelect quotationId={quotation.id} status={quotation.status} />
            <ConvertToInvoiceButton quotationId={quotation.id} />
          </div>
        }
      />
      <div className="flex-1 px-8 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{quotation.contactName}</p>
                <p className="text-xs text-muted">{quotation.contactPhone}</p>
              </div>
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
                <dd className="font-mono tabular-nums">{formatCurrency(quotation.subtotal)}</dd>
              </div>
              {quotation.gstEnabled ? (
                <div className="flex justify-between">
                  <dt className="text-muted">GST ({quotation.gstRate}%)</dt>
                  <dd className="font-mono tabular-nums">{formatCurrency(quotation.taxAmount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
                <dt>Total</dt>
                <dd className="font-mono tabular-nums">{formatCurrency(quotation.total)}</dd>
              </div>
            </dl>

            {quotation.notes ? (
              <p className="mt-4 border-t border-border pt-3 text-sm text-muted">{quotation.notes}</p>
            ) : null}
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="p-5">
              <h2 className="font-display text-sm font-bold">Share</h2>
              <p className="mt-0.5 text-sm text-muted">Send this link to the customer — no login needed.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs">{publicUrl}</code>
                <CopyLinkButton url={publicUrl} />
              </div>
            </Card>

            {quotation.status === "draft" ? (
              <Card className="p-5">
                <DeleteQuotationButton quotationId={quotation.id} />
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
