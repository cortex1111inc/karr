import { count, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatCurrency } from "@/lib/billing/money";
import { PAGE_SIZE, Pagination, parsePage } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_TONE: Record<string, "neutral" | "accent" | "danger"> = {
  draft: "neutral",
  sent: "neutral",
  partial: "accent",
  paid: "accent",
  void: "danger",
};

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser();
  const page = parsePage((await searchParams).page);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(invoices)
      .where(eq(invoices.orgId, user.orgId))
      .orderBy(desc(invoices.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(invoices).where(eq(invoices.orgId, user.orgId)),
  ]);

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Bills, GST, and payment status in one place."
        action={
          <div className="flex items-center gap-3">
            <a href="/api/export/invoices" className="text-sm font-medium text-accent-deep hover:underline">
              Export CSV
            </a>
            <ButtonLink href="/invoices/new" variant="accent" size="sm">
              New invoice
            </ButtonLink>
          </div>
        }
      />
      <div className="flex-1 px-8 py-6">
        {rows.length === 0 ? (
          <EmptyState title="No invoices yet" description="Bill a customer directly, or convert an accepted quotation." action={<ButtonLink href="/invoices/new" variant="accent" size="sm">New invoice</ButtonLink>} />
        ) : (
          <Card className="divide-y divide-border">
            {rows.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-faint">{inv.number}</span>
                    <Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold">{inv.contactName}</p>
                </div>
                <div className="text-right">
                  <span className="block font-mono text-sm font-medium tabular-nums">{formatCurrency(inv.total)}</span>
                  {inv.status === "partial" ? (
                    <span className="block font-mono text-xs tabular-nums text-faint">
                      {formatCurrency(inv.amountPaid)} paid
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </Card>
        )}
        <Pagination page={page} total={total} pathname="/invoices" />
      </div>
    </>
  );
}
