"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteCustomer } from "../actions";

export function DeleteCustomerButton({ customerId, customerName }: { customerId: string; customerName: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="danger"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Delete ${customerName}? This can't be undone.`)) return;
        startTransition(() => {
          deleteCustomer(customerId);
        });
      }}
    >
      {isPending ? "Deleting…" : "Delete customer"}
    </Button>
  );
}
