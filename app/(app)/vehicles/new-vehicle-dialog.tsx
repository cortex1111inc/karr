"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { createVehicle } from "./actions";

const initialState: { error: string | null } = { error: null };

export function NewVehicleDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);
  const [state, formAction, pending] = useActionState(createVehicle, initialState);

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
        Add vehicle
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
            <h2 className="font-display text-base font-bold">Add vehicle</h2>
            <p className="mt-0.5 text-sm text-muted">Add a vehicle to your rental fleet.</p>
          </div>

          <div>
            <Label htmlFor="registrationNumber">Registration number</Label>
            <Input id="registrationNumber" name="registrationNumber" required placeholder="KL-07-AB-1234" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="make">Make</Label>
              <Input id="make" name="make" placeholder="Maruti" />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Input id="model" name="model" placeholder="Swift" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" placeholder="Hatchback" />
            </div>
            <div>
              <Label htmlFor="dailyRate">Daily rate</Label>
              <Input id="dailyRate" name="dailyRate" type="number" min={0} step="0.01" placeholder="1500" />
            </div>
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
              {pending ? "Saving…" : "Add vehicle"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
