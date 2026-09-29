"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ui/dialog";
import { useActionToast } from "@/components/ui/toast";
import { changePassword, signOutEverywhere, updateName } from "./actions";

const initial = { error: null as string | null };

export function NameForm({ fullName }: { fullName: string }) {
  const [state, formAction, pending] = useActionState(updateName, initial);
  useActionToast(state, pending, "Name updated");
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1 sm:max-w-xs">
        <Label htmlFor="fullName">Name</Label>
        <Input id="fullName" name="fullName" required defaultValue={fullName} autoComplete="name" />
      </div>
      <Button type="submit" variant="accent" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      {state.error ? (
        <p role="alert" className="w-full text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function PasswordChangeForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(changePassword, initial);
  useActionToast(state, pending, "Password changed");
  useEffect(() => {
    if (state.error === null && !pending) formRef.current?.reset();
  }, [state, pending]);
  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-3 sm:max-w-md sm:grid-cols-2">
      <div>
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <div>
        <Label htmlFor="confirm">Confirm</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}

export function SignOutEverywhereButton() {
  return (
    <ConfirmButton
      label="Sign out everywhere"
      pendingLabel="Signing out…"
      variant="ghost"
      title="Sign out on every device?"
      body="You'll be signed out here and on any other phone or browser using this account."
      confirmLabel="Sign out everywhere"
      onConfirm={() => signOutEverywhere()}
    />
  );
}
