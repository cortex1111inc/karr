"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/billing/money";
import { startOnlinePayment } from "./actions";

export function PayButton({ token, balance }: { token: string; balance: number }) {
  const [state, formAction, pending] = useActionState(() => startOnlinePayment(token), { error: null });
  return (
    <form action={formAction} className="mt-5 flex flex-col gap-2">
      <Button type="submit" variant="accent" disabled={pending} className="w-full">
        {pending ? "Opening secure payment…" : `Pay ${formatCurrency(balance)} now`}
      </Button>
      <p className="text-center text-xs text-faint">UPI, cards and netbanking via Razorpay.</p>
      {state.error ? (
        <p role="alert" className="text-center text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
