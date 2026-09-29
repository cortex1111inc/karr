"use client";

import { useState } from "react";
import { FormDialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { recordStockMovement } from "../actions";

type MovementType = "restock" | "usage" | "adjustment";

function MovementFields({ unit }: { unit: string }) {
  const [type, setType] = useState<MovementType>("restock");
  return (
    <>
      <div>
        <Label htmlFor="type">Type</Label>
        <Select id="type" name="type" value={type} onChange={(e) => setType(e.target.value as MovementType)}>
          <option value="restock">Restock (add)</option>
          <option value="usage">Usage (remove)</option>
          <option value="adjustment">Adjustment (correction)</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="quantity">
          Quantity ({unit}){type === "adjustment" ? " — negative to subtract" : ""}
        </Label>
        <Input id="quantity" name="quantity" type="number" required min={type === "adjustment" ? undefined : 1} />
      </div>
      <div>
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea id="note" name="note" rows={2} />
      </div>
    </>
  );
}

export function RecordMovementDialog({ stockItemId, unit }: { stockItemId: string; unit: string }) {
  return (
    <FormDialog
      triggerLabel="Record movement"
      title="Record stock movement"
      action={recordStockMovement.bind(null, stockItemId)}
      submitLabel="Record"
      successMessage="Stock updated"
    >
      <MovementFields unit={unit} />
    </FormDialog>
  );
}
