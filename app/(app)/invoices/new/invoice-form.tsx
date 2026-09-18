"use client";

import { useActionState } from "react";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LineItemsEditor } from "@/components/billing/line-items-editor";
import { createInvoice } from "../actions";

const initialState: { error: string | null } = { error: null };

export function InvoiceForm({
  defaultContactName,
  defaultContactPhone,
  customerId,
  defaultGstRate,
}: {
  defaultContactName?: string;
  defaultContactPhone?: string;
  customerId?: string;
  defaultGstRate: number;
}) {
  const [state, formAction, pending] = useActionState(createInvoice, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
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

      <LineItemsEditor defaultGstEnabled={false} defaultGstRate={defaultGstRate} />

      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={2} placeholder="Payment due within 7 days…" />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Saving…" : "Create invoice"}
        </Button>
      </div>
    </form>
  );
}
