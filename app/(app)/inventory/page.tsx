import { asc, count, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { stockItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewStockItemDialog } from "./new-stock-item-dialog";
import { PAGE_SIZE, Pagination, parsePage } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser();
  const page = parsePage((await searchParams).page);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(stockItems)
      .where(eq(stockItems.orgId, user.orgId))
      .orderBy(asc(stockItems.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(stockItems).where(eq(stockItems.orgId, user.orgId)),
  ]);

  return (
    <>
      <PageHeader title="Inventory" description="Parts and consumables." action={<NewStockItemDialog />} />
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
        {rows.length === 0 ? (
          <EmptyState title="No stock items yet" description="Track parts and consumables — shampoo, oil, spares — and get a nudge when they run low." />
        ) : (
          <Card className="divide-y divide-border">
            {rows.map((item) => {
              const isLow = item.quantityOnHand <= item.lowStockThreshold;
              return (
                <Link
                  key={item.id}
                  href={`/inventory/${item.id}`}
                  className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-surface-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    {item.sku ? <p className="text-xs text-faint">{item.sku}</p> : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm tabular-nums">
                      {item.quantityOnHand} {item.unit}
                    </span>
                    {isLow ? <Badge tone="danger">Low stock</Badge> : null}
                  </div>
                </Link>
              );
            })}
          </Card>
        )}
        <Pagination page={page} total={total} pathname="/inventory" />
      </div>
    </>
  );
}
