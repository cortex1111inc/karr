"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { convertQuotationToInvoice, deleteQuotation, updateQuotationStatus } from "../actions";

const STATUSES = ["draft", "sent", "accepted", "declined"] as const;

export function QuotationStatusSelect({ quotationId, status }: { quotationId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      className="w-36"
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as (typeof STATUSES)[number];
        startTransition(() => updateQuotationStatus(quotationId, next));
      }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s[0].toUpperCase() + s.slice(1)}
        </option>
      ))}
    </Select>
  );
}

export function ConvertToInvoiceButton({ quotationId }: { quotationId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="accent"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => convertQuotationToInvoice(quotationId))}
    >
      {isPending ? "Converting…" : "Convert to invoice"}
    </Button>
  );
}

export function DeleteQuotationButton({ quotationId }: { quotationId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("Delete this draft quotation?")) return;
        startTransition(() => deleteQuotation(quotationId));
      }}
    >
      {isPending ? "Deleting…" : "Delete"}
    </Button>
  );
}
