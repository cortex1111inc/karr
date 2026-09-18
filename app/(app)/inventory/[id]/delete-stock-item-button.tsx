"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteStockItem } from "../actions";

export function DeleteStockItemButton({ stockItemId, name }: { stockItemId: string; name: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="danger"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Delete ${name}? This removes its movement history too.`)) return;
        startTransition(async () => {
          await deleteStockItem(stockItemId);
          router.push("/inventory");
        });
      }}
    >
      {isPending ? "Deleting…" : "Delete item"}
    </Button>
  );
}
