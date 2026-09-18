"use client";

import { useActionState } from "react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateBillingSettings } from "./actions";

const initialState: { error: string | null } = { error: null };

export function BillingSettingsForm({ defaultGstRate }: { defaultGstRate: number }) {
  const [state, formAction, pending] = useActionState(updateBillingSettings, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor="defaultGstRate">Default GST rate (%)</Label>
        <Input
          id="defaultGstRate"
          name="defaultGstRate"
          type="number"
          min={0}
          max={100}
          step="0.01"
          defaultValue={defaultGstRate}
          className="w-28"
        />
      </div>
      <Button type="submit" variant="accent" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      {state.error ? (
        <p role="alert" className="w-full text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
