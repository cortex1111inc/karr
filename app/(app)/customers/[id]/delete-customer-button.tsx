"use client";

import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/dialog";
import { deleteCustomer } from "../actions";

export function DeleteCustomerButton({ customerId, customerName }: { customerId: string; customerName: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      label="Delete customer"
      pendingLabel="Deleting…"
      title={`Delete ${customerName}?`}
      body="Their profile is removed. Linked leads and invoices stay, but lose the link to this customer. This can't be undone."
      confirmLabel="Delete"
      successMessage="Customer deleted"
      onConfirm={async () => {
        await deleteCustomer(customerId);
        router.push("/customers");
      }}
    />
  );
}
