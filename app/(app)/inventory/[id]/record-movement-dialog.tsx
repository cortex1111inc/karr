"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { recordStockMovement } from "../actions";

const initialState: { error: string | null } = { error: null };

export function RecordMovementDialog({ stockItemId, unit }: { stockItemId: string; unit: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);
  const [type, setType] = useState<"restock" | "usage" | "adjustment">("restock");
  const [state, formAction, pending] = useActionState(recordStockMovement.bind(null, stockItemId), initialState);

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
        Record movement
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
            <h2 className="font-display text-base font-bold">Record stock movement</h2>
          </div>

          <div>
            <Label htmlFor="type">Type</Label>
            <Select id="type" name="type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="restock">Restock (add)</option>
              <option value="usage">Usage (remove)</option>
              <option value="adjustment">Adjustment (correction)</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="quantity">
              Quantity ({unit}){type === "adjustment" ? " — use a negative number to subtract" : ""}
            </Label>
            <Input id="quantity" name="quantity" type="number" required min={type === "adjustment" ? undefined : 1} />
          </div>
          <div>
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea id="note" name="note" rows={2} />
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
