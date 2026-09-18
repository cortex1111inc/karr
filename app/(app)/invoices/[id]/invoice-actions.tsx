"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { deleteInvoice, updateInvoiceStatus } from "../actions";

const MANUAL_STATUSES = ["draft", "sent", "void"] as const;

export function InvoiceStatusSelect({ invoiceId, status }: { invoiceId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      className="w-32"
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as (typeof MANUAL_STATUSES)[number];
        startTransition(() => updateInvoiceStatus(invoiceId, next));
      }}
    >
      {MANUAL_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s[0].toUpperCase() + s.slice(1)}
        </option>
      ))}
    </Select>
  );
}

export function DeleteInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("Delete this draft invoice?")) return;
        startTransition(() => deleteInvoice(invoiceId));
      }}
    >
      {isPending ? "Deleting…" : "Delete"}
    </Button>
  );
}
