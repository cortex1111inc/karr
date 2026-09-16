"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { inviteTeammate } from "./actions";

const initialState: { error: string | null } = { error: null };

export function InviteForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(inviteTeammate, initialState);

  useEffect(() => {
    if (state.error === null && !pending) formRef.current?.reset();
  }, [state, pending]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor="fullName">Name</Label>
        <Input id="fullName" name="fullName" required placeholder="Teammate name" className="w-44" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="teammate@business.com" className="w-56" />
      </div>
      <div>
        <Label htmlFor="role">Role</Label>
        <Select id="role" name="role" defaultValue="staff" className="w-32">
          <option value="staff">Staff</option>
          <option value="owner">Owner</option>
        </Select>
      </div>
      <Button type="submit" variant="accent" size="sm" disabled={pending}>
        {pending ? "Sending…" : "Send invite"}
      </Button>
      {state.error ? (
        <p role="alert" className="w-full text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
