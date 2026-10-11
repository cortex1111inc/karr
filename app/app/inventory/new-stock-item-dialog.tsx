"use client";

import { FormDialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { createStockItem } from "./actions";

export function NewStockItemDialog() {
  return (
    <FormDialog
      triggerLabel="Add item"
      title="Add stock item"
      description="Track a part or consumable."
      action={createStockItem}
      submitLabel="Add item"
      successMessage="Item added"
    >
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
    </FormDialog>
  );
}
