"use client";

import { useId, useMemo, useState } from "react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { calculateTotals, formatCurrency, type LineItemInput } from "@/lib/billing/money";

type Row = LineItemInput & { key: string };

let rowCounter = 0;
function newRow(item?: LineItemInput): Row {
  rowCounter += 1;
  return { description: item?.description ?? "", quantity: item?.quantity ?? 1, unitPrice: item?.unitPrice ?? 0, key: `row-${rowCounter}` };
}

export function LineItemsEditor({
  defaultItems,
  defaultGstEnabled,
  defaultGstRate,
}: {
  defaultItems?: LineItemInput[];
  defaultGstEnabled?: boolean;
  defaultGstRate?: number;
}) {
  const gstCheckboxId = useId();
  const [rows, setRows] = useState<Row[]>(() =>
    defaultItems && defaultItems.length > 0 ? defaultItems.map((item) => newRow(item)) : [newRow()],
  );
  const [gstEnabled, setGstEnabled] = useState(defaultGstEnabled ?? false);
  const [gstRate, setGstRate] = useState(defaultGstRate ?? 18);

  const totals = useMemo(() => calculateTotals(rows, gstEnabled, gstRate), [rows, gstEnabled, gstRate]);
  const itemsJson = useMemo(
    () => JSON.stringify(rows.map((row) => ({ description: row.description, quantity: row.quantity, unitPrice: row.unitPrice }))),
    [rows],
  );

  function updateRow(key: string, patch: Partial<LineItemInput>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="itemsJson" value={itemsJson} />

      {/* Grid rather than <table>: stacks into a card per line on phones
          (a scrolling table inside a form is unusable there), columns from sm up. */}
      <div role="table" aria-label="Line items" className="rounded-lg border border-border text-sm">
        <div
          role="row"
          className="hidden border-b border-border bg-surface-2 sm:grid sm:grid-cols-[1fr_5.5rem_7.5rem_7rem_2.5rem] sm:gap-2 sm:px-2 sm:py-2.5"
        >
          <span role="columnheader" className="px-0.5 font-medium text-faint">Description</span>
          <span role="columnheader" className="font-medium text-faint">Qty</span>
          <span role="columnheader" className="font-medium text-faint">Unit price</span>
          <span role="columnheader" className="text-right font-medium text-faint">Amount</span>
          <span role="columnheader" className="sr-only">Remove</span>
        </div>
        {rows.map((row, index) => (
          <div
            key={row.key}
            role="row"
            className="grid grid-cols-2 gap-2 border-b border-border p-3 last:border-0 sm:grid-cols-[1fr_5.5rem_7.5rem_7rem_2.5rem] sm:items-center sm:p-2"
          >
            <label role="cell" className="col-span-2 sm:col-span-1">
              <span className="mb-1 block text-xs text-faint sm:sr-only">Description</span>
              <Input
                value={row.description}
                onChange={(e) => updateRow(row.key, { description: e.target.value })}
                placeholder="Self-drive rental, 3 days"
                aria-label={`Line ${index + 1} description`}
                className="h-9"
              />
            </label>
            <label role="cell">
              <span className="mb-1 block text-xs text-faint sm:sr-only">Qty</span>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
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
            <div role="cell" className="flex items-center font-mono text-xs tabular-nums sm:justify-end">
              <span className="mr-2 font-sans text-faint sm:hidden">Amount</span>
              {formatCurrency(row.quantity * row.unitPrice)}
            </div>
            <div role="cell" className="flex items-center justify-end">
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
        ))}
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={() => setRows((prev) => [...prev, newRow()])} className="self-start">
        + Add line item
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-6 border-t border-border pt-4">
        <div className="flex items-center gap-3">
          <input
            id={gstCheckboxId}
            type="checkbox"
            name="gstEnabled"
            value="true"
            checked={gstEnabled}
            onChange={(e) => setGstEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-border-strong accent-[var(--accent)]"
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
              className="h-9 w-20"
            />
          ) : (
            <input type="hidden" name="gstRate" value={gstRate} />
          )}
          {gstEnabled ? <span className="text-sm text-faint">%</span> : null}
        </div>

        <dl className="flex min-w-[200px] flex-col gap-1.5 text-sm">
          <div className="flex justify-between gap-6">
            <dt className="text-muted">Subtotal</dt>
            <dd className="font-mono tabular-nums">{formatCurrency(totals.subtotal)}</dd>
          </div>
          {gstEnabled ? (
            <div className="flex justify-between gap-6">
              <dt className="text-muted">GST ({gstRate}%)</dt>
              <dd className="font-mono tabular-nums">{formatCurrency(totals.taxAmount)}</dd>
            </div>
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
