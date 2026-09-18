"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createStockItem } from "./actions";

const initialState: { error: string | null } = { error: null };

export function NewStockItemDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);
  const [state, formAction, pending] = useActionState(createStockItem, initialState);

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
        Add item
      </Button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-xl border border-border bg-surface p-0 shadow-[0_30px_70px_-24px_rgba(30,26,10,0.24)] backdrop:bg-black/30"
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
            <h2 className="font-display text-base font-bold">Add stock item</h2>
            <p className="mt-0.5 text-sm text-muted">Track a part or consumable.</p>
          </div>

          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Engine oil, 5W-30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sku">SKU (optional)</Label>
              <Input id="sku" name="sku" />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" name="unit" defaultValue="pcs" placeholder="pcs, liters…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="quantityOnHand">Starting quantity</Label>
              <Input id="quantityOnHand" name="quantityOnHand" type="number" min={0} defaultValue={0} />
            </div>
            <div>
              <Label htmlFor="lowStockThreshold">Low-stock alert below</Label>
              <Input id="lowStockThreshold" name="lowStockThreshold" type="number" min={0} defaultValue={5} />
            </div>
          </div>
          <div>
            <Label htmlFor="costPrice">Cost price (optional)</Label>
            <Input id="costPrice" name="costPrice" type="number" min={0} step="0.01" />
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
              {pending ? "Saving…" : "Add item"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
