"use client";

import { useActionState } from "react";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GST_STATES } from "@/lib/billing/gst";
import { updateBillingSettings } from "./actions";
import { useActionToast } from "@/components/ui/toast";

const initialState: { error: string | null } = { error: null };

export type BillingProfile = {
  defaultGstRate: number;
  legalName: string | null;
  gstin: string | null;
  billingAddress: string | null;
  stateCode: string | null;
  logoUrl: string | null;
  invoiceTerms: string | null;
};

export function BillingSettingsForm({ profile }: { profile: BillingProfile }) {
  const [state, formAction, pending] = useActionState(updateBillingSettings, initialState);
  useActionToast(state, pending, "Billing profile saved");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="legalName">Legal / trade name</Label>
          <Input id="legalName" name="legalName" defaultValue={profile.legalName ?? ""} placeholder="Acme Rentals Pvt Ltd" />
        </div>
        <div>
          <Label htmlFor="gstin">GSTIN (optional)</Label>
          <Input id="gstin" name="gstin" defaultValue={profile.gstin ?? ""} maxLength={15} placeholder="32ABCDE1234F1Z5" className="font-mono uppercase" />
        </div>
        <div>
          <Label htmlFor="stateCode">State</Label>
          <Select id="stateCode" name="stateCode" defaultValue={profile.stateCode ?? ""}>
            <option value="">Not set</option>
            {GST_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} · {s.name}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-faint">Decides CGST+SGST (same state) vs IGST (other state). Taken from the GSTIN if you enter one.</p>
        </div>
        <div>
          <Label htmlFor="defaultGstRate">Default GST rate (%)</Label>
          <Input id="defaultGstRate" name="defaultGstRate" type="number" min={0} max={100} step="1" defaultValue={profile.defaultGstRate} className="w-28" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="billingAddress">Address</Label>
          <Textarea id="billingAddress" name="billingAddress" rows={2} defaultValue={profile.billingAddress ?? ""} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="logoUrl">Logo URL (optional)</Label>
          <Input id="logoUrl" name="logoUrl" type="url" defaultValue={profile.logoUrl ?? ""} placeholder="https://…/logo.png" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="invoiceTerms">Terms / footer</Label>
          <Textarea
            id="invoiceTerms"
            name="invoiceTerms"
            rows={2}
            defaultValue={profile.invoiceTerms ?? ""}
            placeholder="Payment due within 7 days. Bank: …, IFSC: …"
          />
        </div>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save billing profile"}
        </Button>
      </div>
    </form>
  );
}
