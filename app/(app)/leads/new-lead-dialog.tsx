"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { createLead } from "./actions";

const initialState = { error: null as string | null };

export function NewLeadDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);
  const [state, formAction, pending] = useActionState(createLead, initialState);

  useEffect(() => {
    if (!submittedRef.current || pending) return;
    submittedRef.current = false;
    if (state.error === null) {
      formRef.current?.reset();
      dialogRef.current?.close();
    }
  }, [state, pending]);

  return (
    <>
      <Button variant="accent" size="sm" onClick={() => dialogRef.current?.showModal()}>
        New lead
      </Button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-xl border border-border bg-surface p-0 shadow-[0_30px_70px_-24px_rgba(30,26,10,0.24)] backdrop:bg-black/30"
      >
        <form
          ref={formRef}
          action={formAction}
          onSubmit={() => {
            submittedRef.current = true;
          }}
          className="flex flex-col gap-4 p-6"
        >
          <div>
            <h2 className="font-display text-base font-bold">New lead</h2>
            <p className="mt-0.5 text-sm text-muted">Capture an enquiry before it slips through.</p>
          </div>

          <div>
            <Label htmlFor="contactName">Name</Label>
            <Input id="contactName" name="contactName" required placeholder="Customer name" />
          </div>
          <div>
            <Label htmlFor="contactPhone">Phone</Label>
            <Input id="contactPhone" name="contactPhone" required placeholder="+91 90000 00000" />
          </div>
          <div>
            <Label htmlFor="interest">Enquiry</Label>
            <Textarea id="interest" name="interest" required rows={2} placeholder="SUV, 3-day self-drive" />
          </div>
          <div>
            <Label htmlFor="source">Source</Label>
            <Select id="source" name="source" defaultValue="whatsapp">
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="call">Call</option>
              <option value="website">Website</option>
              <option value="walk_in">Walk-in</option>
              <option value="referral">Referral</option>
              <option value="other">Other</option>
            </Select>
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          ) : null}

          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Add lead"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
