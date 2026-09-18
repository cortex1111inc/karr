"use client";

import { useActionState } from "react";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateOrgSettings } from "./actions";
import { DEFAULT_REMINDER_MESSAGE } from "@/lib/whatsapp/templates";

const initialState: { error: string | null } = { error: null };

export function SettingsForm({
  serviceIntervalDays,
  reminderMessage,
  staleLeadDays,
}: {
  serviceIntervalDays: number;
  reminderMessage: string | null;
  staleLeadDays: number;
}) {
  const [state, formAction, pending] = useActionState(updateOrgSettings, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="serviceIntervalDays">Reminder interval (days)</Label>
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
      <div>
        <Label htmlFor="reminderMessage">Reminder message</Label>
        <Textarea
          id="reminderMessage"
          name="reminderMessage"
          rows={3}
          defaultValue={reminderMessage ?? DEFAULT_REMINDER_MESSAGE}
          placeholder={DEFAULT_REMINDER_MESSAGE}
        />
        <p className="mt-1 text-xs text-faint">
          Use <code>{"{{name}}"}</code> to personalize. Sent automatically once a customer is due.
        </p>
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
