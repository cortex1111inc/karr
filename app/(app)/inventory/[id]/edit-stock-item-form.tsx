"use client";

import { useActionState } from "react";
import type { InferSelectModel } from "drizzle-orm";
import type { stockItems } from "@/db/schema";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateStockItem } from "../actions";

type StockItem = InferSelectModel<typeof stockItems>;

const initialState: { error: string | null } = { error: null };

export function EditStockItemForm({ item }: { item: StockItem }) {
  const [state, formAction, pending] = useActionState(updateStockItem.bind(null, item.id), initialState);

  return (
    <form action={formAction} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={item.name} />
      </div>
      <div>
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" name="sku" defaultValue={item.sku ?? ""} />
      </div>
      <div>
        <Label htmlFor="unit">Unit</Label>
        <Input id="unit" name="unit" required defaultValue={item.unit} />
      </div>
      <div>
        <Label htmlFor="lowStockThreshold">Low-stock alert below</Label>
        <Input id="lowStockThreshold" name="lowStockThreshold" type="number" min={0} defaultValue={item.lowStockThreshold} />
      </div>
      <div>
        <Label htmlFor="costPrice">Cost price</Label>
        <Input id="costPrice" name="costPrice" type="number" min={0} step="0.01" defaultValue={item.costPrice ?? ""} />
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
