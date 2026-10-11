"use client";

import { FormDialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { emailDocument } from "./email-actions";

export function EmailDocumentDialog({ kind, id, defaultTo }: { kind: "invoice" | "quotation"; id: string; defaultTo: string | null }) {
  return (
    <FormDialog
      triggerLabel="Email to customer"
      triggerVariant="ghost"
      title={`Email this ${kind}`}
      description="Sends the customer a link to view it online."
      action={emailDocument.bind(null, kind, id)}
      submitLabel="Send"
      pendingLabel="Sending…"
      successMessage="Email sent"
    >
      <div>
        <Label htmlFor={`email-to-${id}`}>Customer email</Label>
        <Input id={`email-to-${id}`} name="to" type="email" required defaultValue={defaultTo ?? ""} placeholder="customer@example.com" />
      </div>
    </FormDialog>
  );
}
