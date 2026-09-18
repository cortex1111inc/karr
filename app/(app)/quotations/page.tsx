import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { quotations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatCurrency } from "@/lib/billing/money";

const STATUS_TONE: Record<string, "neutral" | "accent" | "danger"> = {
  draft: "neutral",
  sent: "neutral",
  accepted: "accent",
  declined: "danger",
};

export default async function QuotationsPage() {
  const user = await requireUser();

  const rows = await db
    .select()
    .from(quotations)
    .where(eq(quotations.orgId, user.orgId))
    .orderBy(desc(quotations.createdAt));

  return (
    <>
      <PageHeader
        title="Quotations"
        description="Price estimates sent before a booking is confirmed."
        action={<ButtonLink href="/quotations/new" variant="accent" size="sm">New quotation</ButtonLink>}
      />
      <div className="flex-1 px-8 py-6">
        {rows.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted">No quotations yet.</Card>
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
      </div>
    </>
  );
}
