import { count, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { requireOwner } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PAGE_SIZE, Pagination, parsePage } from "@/components/ui/pagination";

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireOwner();
  const page = parsePage((await searchParams).page);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(eq(auditLog.orgId, user.orgId))
      .orderBy(desc(auditLog.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(auditLog).where(eq(auditLog.orgId, user.orgId)),
  ]);

  return (
    <>
      <PageHeader
        title="Audit log"
        description={
          <Link href="/settings" className="text-sm text-muted hover:text-foreground">
            ← Settings
          </Link>
        }
      />
      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {rows.length === 0 ? (
          <EmptyState title="Nothing recorded yet" description="Integration changes, team changes, and voided or deleted records show up here." />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-xs text-faint">
                  <th className="p-3 font-medium">When</th>
                  <th className="p-3 font-medium">Who</th>
                  <th className="p-3 font-medium">What</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap p-3 font-mono text-xs text-muted">{r.createdAt.toLocaleString("en-IN")}</td>
                    <td className="p-3">{r.actorName ?? "—"}</td>
                    <td className="p-3">
                      {r.summary}
                      <span className="ml-2 font-mono text-xs text-faint">{r.action}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
        <Pagination page={page} total={total} pathname="/settings/audit" />
      </div>
    </>
  );
}
