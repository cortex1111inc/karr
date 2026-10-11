"use client";

import { FormDialog } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { createVehicle } from "./actions";

export function NewVehicleDialog() {
  return (
    <FormDialog
      triggerLabel="Add vehicle"
      title="Add vehicle"
      description="Add a vehicle to your rental fleet."
      action={createVehicle}
      submitLabel="Add vehicle"
      successMessage="Vehicle added"
    >
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
    </FormDialog>
  );
}
