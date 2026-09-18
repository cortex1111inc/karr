"use client";

import { useActionState } from "react";
import type { InferSelectModel } from "drizzle-orm";
import type { vehicles } from "@/db/schema";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateVehicle } from "../actions";

type Vehicle = InferSelectModel<typeof vehicles>;

const initialState: { error: string | null } = { error: null };

export function EditVehicleForm({ vehicle }: { vehicle: Vehicle }) {
  const [state, formAction, pending] = useActionState(updateVehicle.bind(null, vehicle.id), initialState);

  return (
    <form action={formAction} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="registrationNumber">Registration number</Label>
        <Input id="registrationNumber" name="registrationNumber" required defaultValue={vehicle.registrationNumber} />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Input id="category" name="category" defaultValue={vehicle.category ?? ""} />
      </div>
      <div>
        <Label htmlFor="make">Make</Label>
        <Input id="make" name="make" defaultValue={vehicle.make ?? ""} />
      </div>
      <div>
        <Label htmlFor="model">Model</Label>
        <Input id="model" name="model" defaultValue={vehicle.model ?? ""} />
      </div>
      <div>
        <Label htmlFor="dailyRate">Daily rate</Label>
        <Input id="dailyRate" name="dailyRate" type="number" min={0} step="0.01" defaultValue={vehicle.dailyRate ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={vehicle.notes ?? ""} />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {state.error}
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
