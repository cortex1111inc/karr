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
}: {
  serviceIntervalDays: number;
  reminderMessage: string | null;
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
