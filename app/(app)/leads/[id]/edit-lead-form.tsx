"use client";

import { useActionState } from "react";
import type { InferSelectModel } from "drizzle-orm";
import type { leads } from "@/db/schema";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateLead } from "../actions";

type Lead = InferSelectModel<typeof leads>;

const initialState: { error: string | null } = { error: null };

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function EditLeadForm({ lead }: { lead: Lead }) {
  const [state, formAction, pending] = useActionState(updateLead.bind(null, lead.id), initialState);

  return (
    <form action={formAction} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="contactName">Name</Label>
        <Input id="contactName" name="contactName" defaultValue={lead.contactName} required />
      </div>
      <div>
        <Label htmlFor="contactPhone">Phone</Label>
        <Input id="contactPhone" name="contactPhone" defaultValue={lead.contactPhone} required />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="interest">Enquiry</Label>
        <Textarea id="interest" name="interest" defaultValue={lead.interest} rows={2} required />
      </div>
      <div>
        <Label htmlFor="source">Source</Label>
        <Select id="source" name="source" defaultValue={lead.source}>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="call">Call</option>
          <option value="website">Website</option>
          <option value="walk_in">Walk-in</option>
          <option value="referral">Referral</option>
          <option value="other">Other</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="followUpAt">Follow up on</Label>
        <Input id="followUpAt" name="followUpAt" type="date" defaultValue={toDateInputValue(lead.followUpAt)} />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {state.error}
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
