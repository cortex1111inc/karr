import { count, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { quotations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatCurrency } from "@/lib/billing/money";
import { PAGE_SIZE, Pagination, parsePage } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Quotations" };

const STATUS_TONE: Record<string, "neutral" | "accent" | "danger"> = {
  draft: "neutral",
  sent: "neutral",
  accepted: "accent",
  declined: "danger",
};

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser();
  const page = parsePage((await searchParams).page);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(quotations)
      .where(eq(quotations.orgId, user.orgId))
      .orderBy(desc(quotations.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(quotations).where(eq(quotations.orgId, user.orgId)),
  ]);

  return (
    <>
      <PageHeader
        title="Quotations"
        description="Price estimates sent before a booking is confirmed."
        action={<ButtonLink href="/quotations/new" variant="accent" size="sm">New quotation</ButtonLink>}
      />
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
        {rows.length === 0 ? (
          <EmptyState title="No quotations yet" description="Send a price estimate before a booking is confirmed — or start one from a lead." action={<ButtonLink href="/quotations/new" variant="accent" size="sm">New quotation</ButtonLink>} />
        ) : (
          <Card className="divide-y divide-border">
            {rows.map((q) => (
              <Link
                key={q.id}
                href={`/quotations/${q.id}`}
                className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-faint">{q.number}</span>
                    <Badge tone={STATUS_TONE[q.status]}>{q.status}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold">{q.contactName}</p>
                </div>
                <span className="font-mono text-sm font-medium tabular-nums">{formatCurrency(q.total)}</span>
              </Link>
            ))}
          </Card>
        )}
        <Pagination page={page} total={total} pathname="/quotations" />
      </div>
    </>
  );
}
