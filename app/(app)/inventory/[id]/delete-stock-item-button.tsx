"use client";

import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/dialog";
import { deleteStockItem } from "../actions";

export function DeleteStockItemButton({ stockItemId, name }: { stockItemId: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      label="Delete item"
      pendingLabel="Deleting…"
      title={`Delete ${name}?`}
      body="Its movement history is deleted too. This can't be undone."
      confirmLabel="Delete"
      successMessage="Item deleted"
      onConfirm={async () => {
        await deleteStockItem(stockItemId);
        router.push("/inventory");
      }}
    />
  );
}
