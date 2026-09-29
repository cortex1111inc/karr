import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, type Executor } from "@/db";
import { stockItems, stockMovementTypeEnum, stockMovements } from "@/db/schema";

export type StockMovementType = (typeof stockMovementTypeEnum.enumValues)[number];

export function signedQuantity(type: StockMovementType, quantity: number): number {
  if (type === "usage") return -Math.abs(quantity);
  if (type === "restock") return Math.abs(quantity);
  return quantity; // adjustment: caller supplies the sign
}

export type StockMovementInput = {
  orgId: string;
  stockItemId: string;
  type: StockMovementType;
  quantity: number;
  note?: string | null;
  createdBy?: string | null;
};

export type StockMovementResult = { ok: true; quantityOnHand: number } | { ok: false; error: string };

// The count change and its movement log row commit together. The UPDATE's
// `quantity_on_hand + delta >= 0` guard makes the check-and-decrement atomic,
// so two concurrent usages can't both pass a stale "enough stock" check.
// Shared by the inventory form and invoices (stock-linked lines).
export async function applyStockMovement(input: StockMovementInput): Promise<StockMovementResult> {
  return db.transaction((tx) => applyStockMovementIn(tx, input));
}

// Same, inside a caller's transaction. On {ok:false} nothing was written,
// but the caller decides whether to roll back its other work.
export async function applyStockMovementIn(exec: Executor, input: StockMovementInput): Promise<StockMovementResult> {
  const delta = signedQuantity(input.type, input.quantity);
  if (delta === 0) return { ok: false, error: "Enter a non-zero quantity" };

  const [updated] = await exec
    .update(stockItems)
    .set({ quantityOnHand: sql`${stockItems.quantityOnHand} + ${delta}`, updatedAt: new Date() })
    .where(
      and(
        eq(stockItems.id, input.stockItemId),
        eq(stockItems.orgId, input.orgId),
        gte(sql`${stockItems.quantityOnHand} + ${delta}`, 0),
      ),
    )
    .returning({ quantityOnHand: stockItems.quantityOnHand, name: stockItems.name });

  if (!updated) {
    const [item] = await exec
      .select({ quantityOnHand: stockItems.quantityOnHand, name: stockItems.name })
      .from(stockItems)
      .where(and(eq(stockItems.id, input.stockItemId), eq(stockItems.orgId, input.orgId)))
      .limit(1);
    return item
      ? { ok: false, error: `Not enough ${item.name} in stock — only ${item.quantityOnHand} on hand.` }
      : { ok: false, error: "Item not found." };
  }

  await exec.insert(stockMovements).values({
    orgId: input.orgId,
    stockItemId: input.stockItemId,
    type: input.type,
    quantity: delta,
    note: input.note ?? null,
    createdBy: input.createdBy ?? null,
  });

  return { ok: true, quantityOnHand: updated.quantityOnHand };
}
