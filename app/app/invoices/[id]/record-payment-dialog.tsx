"use client";

import { FormDialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { formatCurrency } from "@/lib/billing/money";
import { recordPayment } from "../actions";

export function RecordPaymentDialog({ invoiceId, balanceDue }: { invoiceId: string; balanceDue: number }) {
  return (
    <FormDialog
      triggerLabel="Record payment"
      title="Record payment"
      description={`Balance due: ${formatCurrency(balanceDue)}`}
      action={recordPayment.bind(null, invoiceId)}
      submitLabel="Record"
      successMessage="Payment recorded"
    >
      <div>
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          inputMode="decimal"
          min={0.01}
          step="0.01"
          required
          defaultValue={balanceDue > 0 ? balanceDue : undefined}
        />
      </div>
      <div>
        <Label htmlFor="method">Method</Label>
        <Select id="method" name="method" defaultValue="cash">
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="other">Other</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
    </FormDialog>
  );
}
