"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { submitBooking } from "./actions";

const initialState: { error: string | null } = { error: null };

export function BookingForm({ slug, refCode }: { slug: string; refCode?: string }) {
  const [state, formAction, pending] = useActionState(submitBooking.bind(null, slug), initialState);
  // Stamped on the DOM after mount (not during render) so server and client
  // HTML match; the server uses it to reject too-fast (bot) submissions.
  const startedAtRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (startedAtRef.current) startedAtRef.current.value = String(Date.now());
  }, []);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input ref={startedAtRef} type="hidden" name="startedAt" defaultValue="" />
      {refCode ? <input type="hidden" name="ref" value={refCode} /> : null}
      {/* Honeypot — hidden from people and assistive tech, filled by naive bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
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
