"use client";

import { ConfirmButton } from "@/components/ui/dialog";
import { deletePayment } from "../actions";

export function DeletePaymentButton({ paymentId, invoiceId }: { paymentId: string; invoiceId: string }) {
  return (
    <ConfirmButton
      label="Remove"
      pendingLabel="Removing…"
      variant="ghost"
      title="Remove this payment?"
      body="The invoice's paid amount and status are recalculated."
      confirmLabel="Remove payment"
      successMessage="Payment removed"
      onConfirm={() => deletePayment(paymentId, invoiceId)}
    />
  );
}
