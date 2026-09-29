"use client";

import { useState } from "react";
import { FormDialog } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { CHANNELS } from "@/lib/growth";
import { createTrackingLink } from "./actions";

function CommissionFields() {
  const [type, setType] = useState<"none" | "flat" | "percent">("none");
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label htmlFor="commissionType">Commission</Label>
        <Select id="commissionType" name="commissionType" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="none">None</option>
          <option value="flat">₹ per booking</option>
          <option value="percent">% of revenue</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="commissionValue">{type === "percent" ? "Percent" : "Amount (₹)"}</Label>
        <Input
          id="commissionValue"
          name="commissionValue"
          type="number"
          inputMode="decimal"
          min={0}
          max={type === "percent" ? 100 : undefined}
          step="0.01"
          disabled={type === "none"}
          placeholder={type === "none" ? "—" : type === "percent" ? "10" : "250"}
        />
      </div>
    </div>
  );
}

export function NewLinkDialog() {
  return (
    <FormDialog
      triggerLabel="New tracking link"
      title="New tracking link"
      description="Give each influencer or ad its own link to see exactly which bookings it brings in."
      action={createTrackingLink}
      submitLabel="Create link"
      successMessage="Tracking link created"
    >
      <div>
        <Label htmlFor="name">Link name</Label>
        <Input id="name" name="name" required placeholder="Onam offer — Rahul's reel" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="partnerName">Partner (optional)</Label>
          <Input id="partnerName" name="partnerName" placeholder="Rahul K" />
        </div>
        <div>
          <Label htmlFor="channel">Channel</Label>
          <Select id="channel" name="channel" defaultValue="influencer">
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="code">Custom code (optional)</Label>
        <Input id="code" name="code" placeholder="rahul-onam" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        <p className="mt-1 text-xs text-faint">Leave blank to generate one. Lowercase letters, numbers and dashes.</p>
      </div>
      <CommissionFields />
    </FormDialog>
  );
}
