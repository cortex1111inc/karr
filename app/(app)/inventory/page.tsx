import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { stockItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewStockItemDialog } from "./new-stock-item-dialog";

export default async function InventoryPage() {
  const user = await requireUser();

  const rows = await db
    .select()
    .from(stockItems)
    .where(eq(stockItems.orgId, user.orgId))
    .orderBy(asc(stockItems.name));

  return (
    <>
      <PageHeader title="Inventory" description="Parts and consumables." action={<NewStockItemDialog />} />
      <div className="flex-1 px-8 py-6">
        {rows.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted">No stock items yet.</Card>
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
      </div>
    </>
  );
}
