import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { stockItems, stockMovements } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditStockItemForm } from "./edit-stock-item-form";
import { RecordMovementDialog } from "./record-movement-dialog";
import { DeleteStockItemButton } from "./delete-stock-item-button";

const TYPE_LABEL: Record<string, string> = {
  restock: "Restock",
  usage: "Usage",
  adjustment: "Adjustment",
};

export default async function StockItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const [item] = await db
    .select()
    .from(stockItems)
    .where(and(eq(stockItems.id, id), eq(stockItems.orgId, user.orgId)))
    .limit(1);

  if (!item) notFound();

  const movements = await db
    .select()
    .from(stockMovements)
    .where(eq(stockMovements.stockItemId, id))
    .orderBy(desc(stockMovements.createdAt))
    .limit(30);

  const isLow = item.quantityOnHand <= item.lowStockThreshold;

  return (
    <>
      <PageHeader
        title={item.name}
        description={
          <Link href="/inventory" className="text-sm text-muted hover:text-foreground">
            ← Back to inventory
          </Link>
        }
        action={
          <div className="flex items-center gap-2">
            <RecordMovementDialog stockItemId={item.id} unit={item.unit} />
            <DeleteStockItemButton stockItemId={item.id} name={item.name} />
          </div>
        }
      />
      <div className="flex-1 px-8 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <div className="flex flex-col gap-6">
            <Card className="p-5">
              <h2 className="font-display text-sm font-bold">Details</h2>
              <EditStockItemForm item={item} />
            </Card>

            <Card className="p-5">
              <h2 className="font-display text-sm font-bold">Movement history</h2>
              <div className="mt-3 flex flex-col gap-3">
                {movements.length === 0 ? (
                  <p className="text-sm text-faint">No movements recorded yet.</p>
                ) : (
                  movements.map((movement) => (
                    <div key={movement.id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium">
                          <span className="font-mono text-xs uppercase tracking-wide text-faint">
                            {TYPE_LABEL[movement.type]}
                          </span>{" "}
                          {movement.quantity > 0 ? "+" : ""}
                          {movement.quantity} {item.unit}
                        </p>
                        <p className="text-xs text-faint">{movement.createdAt.toLocaleString()}</p>
                        {movement.note ? <p className="mt-0.5 text-xs text-muted">{movement.note}</p> : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card className="p-5">
              <h2 className="font-display text-sm font-bold">On hand</h2>
              <p className="mt-2 font-mono text-2xl font-medium tabular-nums">
                {item.quantityOnHand} <span className="text-base text-faint">{item.unit}</span>
              </p>
              {isLow ? (
                <Badge tone="danger" className="mt-2">
                  Below threshold ({item.lowStockThreshold})
                </Badge>
              ) : (
                <p className="mt-2 text-xs text-faint">Alert below {item.lowStockThreshold}</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
