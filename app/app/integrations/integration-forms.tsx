"use client";

import { useActionState, useTransition } from "react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/dialog";
import { useActionToast, useToast } from "@/components/ui/toast";
import {
  disconnectIntegration,
  saveEmailIntegration,
  saveRazorpayIntegration,
  sendEmailTest,
} from "./actions";

const initial: { error: string | null } = { error: null };

function FormError({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="text-sm text-danger">
      {error}
    </p>
  ) : null;
}

function SecretInput({ id, label, saved, placeholder, hint }: { id: string; label: string; saved: boolean; placeholder: string; hint?: string }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type="password"
        autoComplete="off"
        required={!saved}
        placeholder={saved ? "•••••••••• (leave blank to keep)" : placeholder}
      />
      {hint ? <p className="mt-1 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

function SubmitRow({ pending, connected }: { pending: boolean; connected: boolean }) {
  return (
    <div>
      <Button type="submit" variant="accent" size="sm" disabled={pending}>
        {pending ? "Saving…" : connected ? "Update" : "Connect"}
      </Button>
    </div>
  );
}

export function EmailForm({ fromAddress, isConnected }: { fromAddress: string | null; isConnected: boolean }) {
  const [state, formAction, pending] = useActionState(saveEmailIntegration, initial);
  useActionToast(state, pending, "Email connection saved");
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="fromAddress">From address</Label>
        <Input id="fromAddress" name="fromAddress" required defaultValue={fromAddress ?? ""} placeholder="Acme Rentals <bookings@acme.in>" />
        <p className="mt-1 text-xs text-faint">The domain must be verified in your Resend dashboard.</p>
      </div>
      <SecretInput id="apiKey" label="Resend API key" saved={isConnected} placeholder="re_xxxxxxxx" />
      <FormError error={state.error} />
      <SubmitRow pending={pending} connected={isConnected} />
    </form>
  );
}

export function RazorpayForm({ keyId, isConnected, webhookUrl }: { keyId: string | null; isConnected: boolean; webhookUrl: string }) {
  const [state, formAction, pending] = useActionState(saveRazorpayIntegration, initial);
  useActionToast(state, pending, "Razorpay connection saved");
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="keyId">Key ID</Label>
        <Input id="keyId" name="keyId" required defaultValue={keyId ?? ""} placeholder="rzp_live_xxxxxxxx" />
      </div>
      <SecretInput id="keySecret" label="Key secret" saved={isConnected} placeholder="Key secret" />
      <SecretInput
        id="webhookSecret"
        label="Webhook secret"
        saved={isConnected}
        placeholder="Secret you set on the webhook"
        hint="Razorpay Dashboard → Webhooks → Add: use the URL below, pick the payment_link.paid event, and choose a secret."
      />
      <div>
        <p className="text-xs font-medium text-muted">Webhook URL</p>
        <code className="mt-1 block break-all rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs">{webhookUrl}</code>
      </div>
      <FormError error={state.error} />
      <SubmitRow pending={pending} connected={isConnected} />
    </form>
  );
}

export function TestButton() {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await sendEmailTest();
          toast(res.error ?? "Test email sent to you", res.error ? "error" : "success");
        })
      }
    >
      {pending ? "Sending…" : "Send test"}
    </Button>
  );
}

const DISCONNECT_COPY = {
  email: { name: "email", body: "Emails will fall back to the shared sender (if any) or be logged instead of sent." },
  razorpay: { name: "Razorpay", body: "Customers will no longer see a Pay now button on invoices." },
} as const;

export function DisconnectButton({ provider }: { provider: keyof typeof DISCONNECT_COPY }) {
  const copy = DISCONNECT_COPY[provider];
  return (
    <ConfirmButton
      label="Disconnect"
      pendingLabel="Disconnecting…"
      variant="ghost"
      title={`Disconnect ${copy.name}?`}
      body={copy.body}
      confirmLabel="Disconnect"
      successMessage={`${copy.name[0].toUpperCase()}${copy.name.slice(1)} disconnected`}
      onConfirm={() => disconnectIntegration(provider)}
    />
  );
}
