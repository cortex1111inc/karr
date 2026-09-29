"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { convertQuotationToInvoice, deleteQuotation, updateQuotationStatus } from "../actions";

const STATUSES = ["draft", "sent", "accepted", "declined"] as const;

export function QuotationStatusSelect({ quotationId, status }: { quotationId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <Select
      className="w-36"
      value={status}
      disabled={isPending}
      aria-label="Quotation status"
      onChange={(e) => {
        const next = e.target.value as (typeof STATUSES)[number];
        startTransition(async () => {
          await updateQuotationStatus(quotationId, next);
          toast(`Marked ${next}`);
        });
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
  const router = useRouter();
  return (
    <ConfirmButton
      label="Delete draft"
      pendingLabel="Deleting…"
      variant="ghost"
      title="Delete this draft quotation?"
      body="Only drafts can be deleted. The quotation number isn't reused."
      confirmLabel="Delete"
      successMessage="Quotation deleted"
      onConfirm={async () => {
        await deleteQuotation(quotationId);
        router.push("/quotations");
      }}
    />
  );
}
