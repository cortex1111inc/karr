"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { respondToQuotation } from "./actions";

export function QuoteResponse({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(respondToQuotation.bind(null, token), { error: null });
  const [asking, setAsking] = useState(false);

  if (state.done) {
    return (
      <p role="status" className="mt-6 rounded-lg bg-accent-soft px-3 py-2 text-center text-sm text-accent-deep">
        {state.done === "accepted" ? "Thanks — quotation accepted. We'll be in touch to confirm." : "Thanks — we've got your request and will send a revised quote."}
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3 border-t border-border pt-5">
      {asking ? (
        <div>
          <Label htmlFor="message">What would you like changed?</Label>
          <Textarea id="message" name="message" rows={3} required maxLength={1000} autoFocus />
        </div>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {asking ? (
          <>
            <Button type="submit" name="response" value="changes" variant="accent" disabled={pending}>
              {pending ? "Sending…" : "Send request"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAsking(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button type="submit" name="response" value="accept" variant="accent" disabled={pending}>
              {pending ? "Accepting…" : "Accept quotation"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAsking(true)}>
              Request changes
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
