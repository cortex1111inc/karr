"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sendCampaign } from "./actions";

const initialState: { error: string | null } = { error: null };

export function CampaignForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(sendCampaign, initialState);

  useEffect(() => {
    if (state.error === null && !pending) formRef.current?.reset();
  }, [state, pending]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="name">Campaign name</Label>
        <Input id="name" name="name" required placeholder="September service push" />
      </div>
      <div>
        <Label htmlFor="audience">Audience</Label>
        <Select id="audience" name="audience" defaultValue="due">
          <option value="due">Due for service</option>
          <option value="all">All customers</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={3}
          placeholder="Hi {{name}}, it's been a while — book your next service for 10% off this week."
        />
        <p className="mt-1 text-xs text-faint">Use <code>{"{{name}}"}</code> to personalize with each customer&apos;s name.</p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send campaign"}
        </Button>
      </div>
    </form>
  );
}
