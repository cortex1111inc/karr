"use client";

import { useTransition } from "react";
import { deletePayment } from "../actions";

export function DeletePaymentButton({ paymentId, invoiceId }: { paymentId: string; invoiceId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("Remove this payment record?")) return;
        startTransition(() => deletePayment(paymentId, invoiceId));
      }}
      className="text-xs text-faint transition-colors hover:text-danger disabled:opacity-50"
    >
      {isPending ? "Removing…" : "Remove"}
    </button>
  );
}
