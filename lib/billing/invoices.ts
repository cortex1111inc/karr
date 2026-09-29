import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db, type Executor } from "@/db";
import { invoiceItems, invoices, stockItems } from "@/db/schema";
import { calculateTotals } from "@/lib/billing/money";
import { nextDocumentNumber } from "@/lib/billing/numbering";
import type { ParsedLineItem } from "@/lib/billing/schema";
import { applyStockMovementIn } from "@/lib/inventory/stock";
import { generatePublicToken } from "@/lib/tokens";

class Rollback extends Error {}

export type InvoiceHeader = {
  customerId: string | null;
  leadId?: string | null;
  quotationId?: string | null;
  contactName: string;
  contactPhone: string;
  notes: string | null;
  gstEnabled: boolean;
  gstRate: number;
  placeOfSupply: string | null;
  customerGstin: string | null;
  interState: boolean;
};

// Drops stock ids that aren't this org's, so a forged id can't link (or on
// invoices, decrement) another org's stock.
export async function ownedStockItemIds(orgId: string, items: ParsedLineItem[], exec: Executor = db): Promise<ParsedLineItem[]> {
  const ids = [...new Set(items.map((i) => i.stockItemId).filter((v): v is string => Boolean(v)))];
  if (ids.length === 0) return items;
  const rows = await exec
    .select({ id: stockItems.id })
    .from(stockItems)
    .where(and(eq(stockItems.orgId, orgId), inArray(stockItems.id, ids)));
  const owned = new Set(rows.map((r) => r.id));
  return items.map((i) => (i.stockItemId && !owned.has(i.stockItemId) ? { ...i, stockItemId: null } : i));
}

// Invoice + items + number + stock usage for linked lines, all in one
// transaction: if any line is short on stock nothing is written.
export async function createInvoiceRecord(input: {
  orgId: string;
  createdBy: string | null;
  header: InvoiceHeader;
  items: ParsedLineItem[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { orgId, header } = input;
  const totals = calculateTotals(input.items, header.gstEnabled, header.gstRate);

  try {
    const id = await db.transaction(async (tx) => {
      const items = await ownedStockItemIds(orgId, input.items, tx);
      const number = await nextDocumentNumber(orgId, "invoice", tx);
      const [invoice] = await tx
        .insert(invoices)
        .values({
          orgId,
          customerId: header.customerId,
          leadId: header.leadId ?? null,
          quotationId: header.quotationId ?? null,
          number,
          contactName: header.contactName,
          contactPhone: header.contactPhone,
          notes: header.notes,
          gstEnabled: header.gstEnabled,
          gstRate: header.gstEnabled ? header.gstRate : 0,
          placeOfSupply: header.placeOfSupply,
          customerGstin: header.customerGstin,
          interState: header.gstEnabled && header.interState,
          subtotal: totals.subtotal.toString(),
          taxAmount: totals.taxAmount.toString(),
          total: totals.total.toString(),
          publicToken: generatePublicToken(),
          createdBy: input.createdBy,
        })
        .returning({ id: invoices.id });

      await tx.insert(invoiceItems).values(
        items.map((item, index) => ({
          invoiceId: invoice.id,
          description: item.description,
          hsnSac: item.hsnSac,
          stockItemId: item.stockItemId,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          amount: (Math.round(item.quantity * item.unitPrice * 100) / 100).toString(),
          sortOrder: index,
        })),
      );

      for (const item of items) {
        if (!item.stockItemId) continue;
        const res = await applyStockMovementIn(tx, {
          orgId,
          stockItemId: item.stockItemId,
          type: "usage",
          quantity: item.quantity,
          note: `Invoice ${number}`,
          createdBy: input.createdBy,
        });
        if (!res.ok) throw new Rollback(res.error);
      }
      return invoice.id;
    });
    return { ok: true, id };
  } catch (error) {
    if (error instanceof Rollback) return { ok: false, error: error.message };
    throw error;
  }
}

// Puts linked stock back (void/delete) or takes it again (un-void). Runs in
// one transaction; taking again fails as a whole if anything is short.
export async function moveInvoiceStock(input: {
  orgId: string;
  invoiceId: string;
  direction: "return" | "take";
  createdBy: string | null;
  exec?: Executor;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const run = async (tx: Executor) => {
    const [inv] = await tx
      .select({ number: invoices.number })
      .from(invoices)
      .where(and(eq(invoices.id, input.invoiceId), eq(invoices.orgId, input.orgId)))
      .limit(1);
    if (!inv) throw new Rollback("Invoice not found.");
    const lines = await tx
      .select({ stockItemId: invoiceItems.stockItemId, quantity: invoiceItems.quantity })
      .from(invoiceItems)
      .where(and(eq(invoiceItems.invoiceId, input.invoiceId), isNotNull(invoiceItems.stockItemId)));
    for (const line of lines) {
      const qty = Math.round(Number(line.quantity));
      const res = await applyStockMovementIn(tx, {
        orgId: input.orgId,
        stockItemId: line.stockItemId!,
        type: input.direction === "take" ? "usage" : "adjustment",
        quantity: input.direction === "take" ? qty : Math.abs(qty),
        note: input.direction === "take" ? `Invoice ${inv.number} reinstated` : `Invoice ${inv.number} voided/deleted`,
        createdBy: input.createdBy,
      });
      if (!res.ok && res.error !== "Item not found.") throw new Rollback(res.error);
    }
  };

  try {
    if (input.exec) await run(input.exec);
    else await db.transaction(run);
    return { ok: true };
  } catch (error) {
    if (error instanceof Rollback) return { ok: false, error: error.message };
    throw error;
  }
}
