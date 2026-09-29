"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { deleteInvoice, updateInvoiceStatus } from "../actions";

const MANUAL_STATUSES = ["draft", "sent", "void"] as const;

export function InvoiceStatusSelect({ invoiceId, status }: { invoiceId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <Select
      className="w-32"
      value={status}
      disabled={isPending}
      aria-label="Invoice status"
      onChange={(e) => {
        const next = e.target.value as (typeof MANUAL_STATUSES)[number];
        startTransition(async () => {
          const res = await updateInvoiceStatus(invoiceId, next);
          toast(res.error ?? `Marked ${next}`, res.error ? "error" : "success");
        });
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
  const router = useRouter();
  return (
    <ConfirmButton
      label="Delete draft"
      pendingLabel="Deleting…"
      variant="ghost"
      title="Delete this draft invoice?"
      body="Only drafts can be deleted. The invoice number isn't reused."
      confirmLabel="Delete"
      successMessage="Invoice deleted"
      onConfirm={async () => {
        await deleteInvoice(invoiceId);
        router.push("/invoices");
      }}
    />
  );
}
