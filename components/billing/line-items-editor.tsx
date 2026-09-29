"use client";

import { useId, useMemo, useState } from "react";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { calculateTotals, formatCurrency, type LineItemInput } from "@/lib/billing/money";
import { GST_STATES, isInterState, splitTax } from "@/lib/billing/gst";

export type EditorLineItem = LineItemInput & { hsnSac?: string | null; stockItemId?: string | null };
export type StockOption = { id: string; name: string; unit: string; quantityOnHand: number };

type Row = { description: string; quantity: number; unitPrice: number; hsnSac: string; stockItemId: string; key: string };

let rowCounter = 0;
function newRow(item?: EditorLineItem): Row {
  rowCounter += 1;
  return {
    description: item?.description ?? "",
    quantity: item?.quantity ?? 1,
    unitPrice: item?.unitPrice ?? 0,
    hsnSac: item?.hsnSac ?? "",
    stockItemId: item?.stockItemId ?? "",
    key: `row-${rowCounter}`,
  };
}

const COLS = "sm:grid-cols-[1fr_5.5rem_5rem_7rem_6.5rem_2.5rem]";

export function LineItemsEditor({
  defaultItems,
  defaultGstEnabled,
  defaultGstRate,
  stockOptions = [],
  orgStateCode = null,
}: {
  defaultItems?: EditorLineItem[];
  defaultGstEnabled?: boolean;
  defaultGstRate?: number;
  stockOptions?: StockOption[];
  orgStateCode?: string | null;
}) {
  const gstCheckboxId = useId();
  const [rows, setRows] = useState<Row[]>(() =>
    defaultItems && defaultItems.length > 0 ? defaultItems.map((item) => newRow(item)) : [newRow()],
  );
  const [gstEnabled, setGstEnabled] = useState(defaultGstEnabled ?? false);
  const [gstRate, setGstRate] = useState(defaultGstRate ?? 18);
  const [placeOfSupply, setPlaceOfSupply] = useState(orgStateCode ?? "");
  const [customerGstin, setCustomerGstin] = useState("");

  const totals = useMemo(() => calculateTotals(rows, gstEnabled, gstRate), [rows, gstEnabled, gstRate]);
  const effectivePos = placeOfSupply || (customerGstin.length >= 2 ? customerGstin.slice(0, 2) : "");
  const interState = isInterState(orgStateCode, effectivePos);
  const split = splitTax(totals.taxAmount, interState);
  const stockById = useMemo(() => new Map(stockOptions.map((s) => [s.id, s])), [stockOptions]);

  const itemsJson = useMemo(
    () =>
      JSON.stringify(
        rows.map((row) => ({
          description: row.description,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          hsnSac: row.hsnSac || null,
          stockItemId: row.stockItemId || null,
        })),
      ),
    [rows],
  );

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function pickStock(key: string, stockItemId: string) {
    const item = stockById.get(stockItemId);
    setRows((prev) =>
      prev.map((row) =>
        row.key === key
          ? { ...row, stockItemId, description: item && !row.description ? item.name : row.description }
          : row,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="itemsJson" value={itemsJson} />

      {/* Grid rather than <table>: stacks into a card per line on phones
          (a scrolling table inside a form is unusable there), columns from sm up. */}
      <div role="table" aria-label="Line items" className="rounded-lg border border-border text-sm">
        <div role="row" className={`hidden border-b border-border bg-surface-2 sm:grid ${COLS} sm:gap-2 sm:px-2 sm:py-2.5`}>
          <span role="columnheader" className="px-0.5 font-medium text-faint">Description</span>
          <span role="columnheader" className="font-medium text-faint">HSN/SAC</span>
          <span role="columnheader" className="font-medium text-faint">Qty</span>
          <span role="columnheader" className="font-medium text-faint">Unit price</span>
          <span role="columnheader" className="text-right font-medium text-faint">Amount</span>
          <span role="columnheader" className="sr-only">Remove</span>
        </div>
        {rows.map((row, index) => {
          const stock = row.stockItemId ? stockById.get(row.stockItemId) : undefined;
          const short = stock && row.quantity > stock.quantityOnHand;
          return (
            <div
              key={row.key}
              role="row"
              className={`grid grid-cols-2 gap-2 border-b border-border p-3 last:border-0 ${COLS} sm:items-start sm:p-2`}
            >
              <div role="cell" className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
                <label>
                  <span className="mb-1 block text-xs text-faint sm:sr-only">Description</span>
                  <Input
                    value={row.description}
                    onChange={(e) => updateRow(row.key, { description: e.target.value })}
                    placeholder="Self-drive rental, 3 days"
                    aria-label={`Line ${index + 1} description`}
                    className="h-9"
                  />
                </label>
                {stockOptions.length > 0 ? (
                  <label className="flex items-center gap-2">
                    <span className="shrink-0 text-xs text-faint">Stock</span>
                    <Select
                      value={row.stockItemId}
                      onChange={(e) => pickStock(row.key, e.target.value)}
                      aria-label={`Line ${index + 1} stock item`}
                      className="h-8 text-xs"
                    >
                      <option value="">Not from inventory</option>
                      {stockOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.quantityOnHand} {s.unit} left)
                        </option>
                      ))}
                    </Select>
                  </label>
                ) : null}
                {short ? (
                  <p className="text-xs text-danger">Only {stock.quantityOnHand} {stock.unit} in stock.</p>
                ) : null}
              </div>
              <label role="cell">
                <span className="mb-1 block text-xs text-faint sm:sr-only">HSN/SAC</span>
                <Input
                  value={row.hsnSac}
                  inputMode="numeric"
                  maxLength={8}
                  onChange={(e) => updateRow(row.key, { hsnSac: e.target.value.replace(/\D/g, "") })}
                  placeholder="9966"
                  aria-label={`Line ${index + 1} HSN or SAC code`}
                  className="h-9"
                />
              </label>
              <label role="cell">
                <span className="mb-1 block text-xs text-faint sm:sr-only">Qty</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={row.stockItemId ? "1" : "0.01"}
                  value={row.quantity}
                  onChange={(e) => updateRow(row.key, { quantity: Number(e.target.value) || 0 })}
                  aria-label={`Line ${index + 1} quantity`}
                  className="h-9"
                />
              </label>
              <label role="cell">
                <span className="mb-1 block text-xs text-faint sm:sr-only">Unit price</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={row.unitPrice}
                  onChange={(e) => updateRow(row.key, { unitPrice: Number(e.target.value) || 0 })}
                  aria-label={`Line ${index + 1} unit price`}
                  className="h-9"
                />
              </label>
              <div role="cell" className="flex h-9 items-center font-mono text-xs tabular-nums sm:justify-end">
                <span className="mr-2 font-sans text-faint sm:hidden">Amount</span>
                {formatCurrency(row.quantity * row.unitPrice)}
              </div>
              <div role="cell" className="flex h-9 items-center justify-end">
                <button
                  type="button"
                  aria-label={`Remove line ${index + 1}`}
                  disabled={rows.length === 1}
                  onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== row.key) : prev))}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={() => setRows((prev) => [...prev, newRow()])} className="self-start">
        + Add line item
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-6 border-t border-border pt-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <input
              id={gstCheckboxId}
              type="checkbox"
              name="gstEnabled"
              value="true"
              checked={gstEnabled}
              onChange={(e) => setGstEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-border-strong accent-accent"
            />
            <Label htmlFor={gstCheckboxId} className="mb-0 normal-case tracking-normal">
              Apply GST
            </Label>
            {gstEnabled ? (
              <Input
                type="number"
                name="gstRate"
                min={0}
                max={100}
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value) || 0)}
                aria-label="GST rate"
                className="h-9 w-20"
              />
            ) : (
              <input type="hidden" name="gstRate" value={gstRate} />
            )}
            {gstEnabled ? <span className="text-sm text-faint">%</span> : null}
          </div>
          {gstEnabled ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor={`${gstCheckboxId}-pos`}>Place of supply</Label>
                <Select
                  id={`${gstCheckboxId}-pos`}
                  name="placeOfSupply"
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="h-9"
                >
                  <option value="">Not specified</option>
                  {GST_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} · {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor={`${gstCheckboxId}-gstin`}>Customer GSTIN (optional)</Label>
                <Input
                  id={`${gstCheckboxId}-gstin`}
                  name="customerGstin"
                  value={customerGstin}
                  maxLength={15}
                  onChange={(e) => setCustomerGstin(e.target.value.toUpperCase().replace(/\s/g, ""))}
                  placeholder="32ABCDE1234F1Z5"
                  className="h-9 font-mono"
                />
              </div>
            </div>
          ) : null}
        </div>

        <dl className="flex min-w-50 flex-col gap-1.5 text-sm">
          <div className="flex justify-between gap-6">
            <dt className="text-muted">Subtotal</dt>
            <dd className="font-mono tabular-nums">{formatCurrency(totals.subtotal)}</dd>
          </div>
          {gstEnabled && interState ? (
            <div className="flex justify-between gap-6">
              <dt className="text-muted">IGST ({gstRate}%)</dt>
              <dd className="font-mono tabular-nums">{formatCurrency(split.igst)}</dd>
            </div>
          ) : gstEnabled ? (
            <>
              <div className="flex justify-between gap-6">
                <dt className="text-muted">CGST ({gstRate / 2}%)</dt>
                <dd className="font-mono tabular-nums">{formatCurrency(split.cgst)}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-muted">SGST ({gstRate / 2}%)</dt>
                <dd className="font-mono tabular-nums">{formatCurrency(split.sgst)}</dd>
              </div>
            </>
          ) : null}
          <div className="flex justify-between gap-6 border-t border-border pt-1.5 text-base font-semibold">
            <dt>Total</dt>
            <dd className="font-mono tabular-nums">{formatCurrency(totals.total)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
