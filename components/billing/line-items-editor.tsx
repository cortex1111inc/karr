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

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left">
              <th className="p-2.5 font-medium text-faint">Description</th>
              <th className="w-24 p-2.5 font-medium text-faint">Qty</th>
              <th className="w-32 p-2.5 font-medium text-faint">Unit price</th>
              <th className="w-32 p-2.5 text-right font-medium text-faint">Amount</th>
              <th className="w-10 p-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border last:border-0">
                <td className="p-2">
                  <Input
                    value={row.description}
                    onChange={(e) => updateRow(row.key, { description: e.target.value })}
                    placeholder="Self-drive rental, 3 days"
                    className="h-9"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.key, { quantity: Number(e.target.value) || 0 })}
                    className="h-9"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.unitPrice}
                    onChange={(e) => updateRow(row.key, { unitPrice: Number(e.target.value) || 0 })}
                    className="h-9"
                  />
                </td>
                <td className="p-2 text-right font-mono text-xs tabular-nums">
                  {formatCurrency(row.quantity * row.unitPrice)}
                </td>
                <td className="p-2 text-center">
                  <button
                    type="button"
                    aria-label="Remove line item"
                    onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== row.key) : prev))}
                    className="text-faint transition-colors hover:text-danger"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
