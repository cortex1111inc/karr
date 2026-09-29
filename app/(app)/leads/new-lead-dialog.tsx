"use client";

import { FormDialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { LEAD_SOURCES } from "@/lib/leads";
import { createLead } from "./actions";

export function NewLeadDialog() {
  return (
    <FormDialog
      triggerLabel="New lead"
      title="New lead"
      description="Capture an enquiry before it slips through."
      action={createLead}
      submitLabel="Add lead"
      successMessage="Lead added"
    >
      <div>
        <Label htmlFor="contactName">Name</Label>
        <Input id="contactName" name="contactName" required placeholder="Customer name" />
      </div>
      <div>
        <Label htmlFor="contactPhone">Phone</Label>
        <Input id="contactPhone" name="contactPhone" type="tel" required placeholder="+91 90000 00000" />
      </div>
      <div>
        <Label htmlFor="interest">Enquiry</Label>
        <Textarea id="interest" name="interest" required rows={2} placeholder="SUV, 3-day self-drive" />
      </div>
      <div>
        <Label htmlFor="source">Source</Label>
        <Select id="source" name="source" defaultValue="whatsapp">
          {LEAD_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
    </FormDialog>
  );
}
