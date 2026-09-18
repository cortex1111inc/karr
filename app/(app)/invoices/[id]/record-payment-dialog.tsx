"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { recordPayment } from "../actions";

const initialState: { error: string | null } = { error: null };

export function RecordPaymentDialog({ invoiceId, balanceDue }: { invoiceId: string; balanceDue: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);
  const [state, formAction, pending] = useActionState(recordPayment.bind(null, invoiceId), initialState);

  useEffect(() => {
    if (!submittedRef.current || pending) return;
    submittedRef.current = false;
    if (state.error === null) {
      formRef.current?.reset();
      dialogRef.current?.close();
    }
  }, [state, pending]);

  return (
    <>
      <Button variant="accent" size="sm" onClick={() => dialogRef.current?.showModal()}>
        Record payment
      </Button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-0 shadow-[0_30px_70px_-24px_rgba(30,26,10,0.24)] backdrop:bg-black/30"
      >
        <form
          ref={formRef}
          action={formAction}
          onSubmit={() => {
            submittedRef.current = true;
          }}
          className="flex flex-col gap-4 p-6"
        >
          <div>
            <h2 className="font-display text-base font-bold">Record payment</h2>
            <p className="mt-0.5 text-sm text-muted">Balance due: ₹{balanceDue.toFixed(2)}</p>
          </div>

          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" type="number" min={0.01} step="0.01" required defaultValue={balanceDue > 0 ? balanceDue : undefined} />
          </div>
          <div>
            <Label htmlFor="method">Method</Label>
            <Select id="method" name="method" defaultValue="cash">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          ) : null}

          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Record"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
