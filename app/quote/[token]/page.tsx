import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { organizations, quotationItems, quotations } from "@/db/schema";
import { formatCurrency } from "@/lib/billing/money";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PublicQuotationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const [quotation] = await db.select().from(quotations).where(eq(quotations.publicToken, token)).limit(1);
  if (!quotation) notFound();

  const [org, items] = await Promise.all([
    db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, quotation.orgId)).limit(1),
    db.select().from(quotationItems).where(eq(quotationItems.quotationId, quotation.id)).orderBy(asc(quotationItems.sortOrder)),
  ]);

  return (
    <main className="flex min-h-full flex-1 justify-center bg-surface-2 px-6 py-16">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-faint">{org[0]?.name}</p>
            <h1 className="font-display text-xl font-bold">Quotation {quotation.number}</h1>
          </div>
          <Badge tone={quotation.status === "accepted" ? "accent" : quotation.status === "declined" ? "danger" : "neutral"}>
            {quotation.status}
          </Badge>
        </div>

        <Card className="p-6">
          <div>
            <p className="text-sm font-semibold">{quotation.contactName}</p>
            <p className="text-xs text-muted">{quotation.contactPhone}</p>
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
      </div>
    </main>
  );
}
