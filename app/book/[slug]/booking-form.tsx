"use client";

import { useActionState } from "react";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { submitBooking } from "./actions";

const initialState: { error: string | null } = { error: null };

export function BookingForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(submitBooking.bind(null, slug), initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="contactName">Name</Label>
        <Input id="contactName" name="contactName" required placeholder="Your name" />
      </div>
      <div>
        <Label htmlFor="contactPhone">Phone</Label>
        <Input id="contactPhone" name="contactPhone" required placeholder="+91 90000 00000" />
      </div>
      <div>
        <Label htmlFor="interest">What do you need?</Label>
        <Textarea id="interest" name="interest" required rows={2} placeholder="SUV, 3-day self-drive" />
      </div>
      <div>
        <Label htmlFor="preferredTime">Preferred time (optional)</Label>
        <Input id="preferredTime" name="preferredTime" placeholder="Tomorrow morning" />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" variant="accent" disabled={pending} className="mt-1">
        {pending ? "Sending…" : "Request booking"}
      </Button>
    </form>
  );
}
