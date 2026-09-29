"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ui/dialog";
import { useActionToast } from "@/components/ui/toast";
import { changePassword, signOutEverywhere, updateName, updateNotificationPrefs } from "./actions";

const initial = { error: null as string | null };

export function NameForm({ fullName, phone }: { fullName: string; phone: string | null }) {
  const [state, formAction, pending] = useActionState(updateName, initial);
  useActionToast(state, pending, "Profile updated");
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1 sm:max-w-xs">
        <Label htmlFor="fullName">Name</Label>
        <Input id="fullName" name="fullName" required defaultValue={fullName} autoComplete="name" />
      </div>
      <div className="min-w-0 flex-1 sm:max-w-xs">
        <Label htmlFor="phone">Phone (for staff alerts)</Label>
        <Input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} autoComplete="tel" placeholder="+91 90000 00000" />
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

const PREF_KINDS: { kind: string; label: string; hint: string }[] = [
  { kind: "follow_up_due", label: "Follow-ups due", hint: "A lead you own has a follow-up date today or earlier." },
  { kind: "stale_lead", label: "Stale leads", hint: "A lead has had no activity for a while." },
  { kind: "low_stock", label: "Low stock", hint: "A stock item fell to its alert threshold." },
  { kind: "invoice_overdue", label: "Unpaid invoices", hint: "An invoice is still unpaid after the reminder interval." },
  { kind: "service_due", label: "Service due", hint: "A customer is due for a service." },
];

export function NotificationPrefsForm({ muted, channels, hasPhone }: { muted: string[]; channels: string[]; hasPhone: boolean }) {
  const [state, formAction, pending] = useActionState(updateNotificationPrefs, initial);
  useActionToast(state, pending, "Preferences saved");
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Notifications to receive</legend>
        {PREF_KINDS.map((p) => (
          <label key={p.kind} className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="kind" value={p.kind} defaultChecked={!muted.includes(p.kind)} className="mt-0.5 size-4 accent-accent" />
            <span>
              <span className="font-medium">{p.label}</span>
              <span className="block text-xs text-faint">{p.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
        <legend className="text-sm font-medium">Also send them to</legend>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="channel" value="email" defaultChecked={channels.includes("email")} className="size-4 accent-accent" />
          My email
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="channel"
            value="whatsapp"
            defaultChecked={channels.includes("whatsapp")}
            disabled={!hasPhone}
            className="size-4 accent-accent"
          />
          My WhatsApp {hasPhone ? null : <span className="text-xs text-faint">(add your phone above first)</span>}
        </label>
      </fieldset>
      <div>
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </form>
  );
}
