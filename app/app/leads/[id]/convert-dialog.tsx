"use client";

import { FormDialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { convertLeadToCustomer } from "../actions";

export function ConvertDialog({
  leadId,
  contactName,
  contactPhone,
}: {
  leadId: string;
  contactName: string;
  contactPhone: string;
}) {
  return (
    <FormDialog
      triggerLabel="Convert to customer"
      title="Convert to customer"
      description={`Creates a customer record for ${contactName} (${contactPhone}) and marks this lead booked.`}
      action={convertLeadToCustomer.bind(null, leadId)}
      submitLabel="Convert"
      pendingLabel="Converting…"
    >
      <div>
        <Label htmlFor="vehicleNumber">Vehicle number (optional)</Label>
        <Input id="vehicleNumber" name="vehicleNumber" placeholder="KL-07-AB-1234" />
      </div>
      <div>
        <Label htmlFor="email">Email (optional)</Label>
        <Input id="email" name="email" type="email" placeholder="customer@email.com" />
      </div>
    </FormDialog>
  );
}
