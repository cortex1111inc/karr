"use client";

import { useActionState } from "react";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LineItemsEditor, type EditorLineItem, type StockOption } from "@/components/billing/line-items-editor";
import { createQuotation } from "../actions";

const initialState: { error: string | null } = { error: null };

export function QuotationForm({
  defaultContactName,
  defaultContactPhone,
  leadId,
  customerId,
  defaultGstRate,
  orgStateCode,
  stockOptions,
  defaultItems,
}: {
  defaultContactName?: string;
  defaultContactPhone?: string;
  leadId?: string;
  customerId?: string;
  defaultGstRate: number;
  orgStateCode: string | null;
  stockOptions: StockOption[];
  defaultItems?: EditorLineItem[];
}) {
  const [state, formAction, pending] = useActionState(createQuotation, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
      {customerId ? <input type="hidden" name="customerId" value={customerId} /> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="contactName">Customer name</Label>
          <Input id="contactName" name="contactName" required defaultValue={defaultContactName} />
        </div>
        <div>
          <Label htmlFor="contactPhone">Phone</Label>
          <Input id="contactPhone" name="contactPhone" required defaultValue={defaultContactPhone} />
        </div>
      </div>

      <LineItemsEditor
        defaultItems={defaultItems}
        defaultGstEnabled={false}
        defaultGstRate={defaultGstRate}
        orgStateCode={orgStateCode}
        stockOptions={stockOptions}
      />

      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={2} placeholder="Valid for 7 days, price excludes fuel…" />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Saving…" : "Create quotation"}
        </Button>
      </div>
    </form>
  );
}
