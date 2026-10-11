"use client";

import { useActionState } from "react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateOrgSettings } from "./actions";
import { useActionToast } from "@/components/ui/toast";

const initialState: { error: string | null } = { error: null };

export function SettingsForm({
  serviceIntervalDays,
  staleLeadDays,
  invoiceReminderDays,
}: {
  serviceIntervalDays: number;
  staleLeadDays: number;
  invoiceReminderDays: number;
}) {
  const [state, formAction, pending] = useActionState(updateOrgSettings, initialState);
  useActionToast(state, pending, "Settings saved");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="serviceIntervalDays">Remind me to contact customers after (days since their last visit)</Label>
        <Input
          id="serviceIntervalDays"
          name="serviceIntervalDays"
          type="number"
          min={1}
          max={365}
          defaultValue={serviceIntervalDays}
          className="w-28"
        />
      </div>
      <div className="border-t border-border pt-4">
        <Label htmlFor="staleLeadDays">Nudge staff after (days of no activity on a lead)</Label>
        <Input
          id="staleLeadDays"
          name="staleLeadDays"
          type="number"
          min={1}
          max={90}
          defaultValue={staleLeadDays}
          className="w-28"
        />
        <p className="mt-1 text-xs text-faint">
          Leads with no updates for this long get an in-app notification for whoever&apos;s assigned (or you, if unassigned).
          Still untouched after twice as long, you get notified too.
        </p>
      </div>

      <div>
        <Label htmlFor="invoiceReminderDays">Chase unpaid invoices after (days since issue)</Label>
        <Input
          id="invoiceReminderDays"
          name="invoiceReminderDays"
          type="number"
          min={1}
          max={90}
          defaultValue={invoiceReminderDays}
          className="w-28"
        />
        <p className="mt-1 text-xs text-faint">
          You get an in-app notification for each overdue invoice, repeated weekly until it&apos;s paid.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
