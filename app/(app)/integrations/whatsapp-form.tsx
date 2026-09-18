"use client";

import { useActionState } from "react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveWhatsAppIntegration } from "./actions";

const initialState: { error: string | null } = { error: null };

export function WhatsAppForm({ phoneNumberId, isConnected }: { phoneNumberId: string | null; isConnected: boolean }) {
  const [state, formAction, pending] = useActionState(saveWhatsAppIntegration, initialState);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <div>
        <Label htmlFor="phoneNumberId">Phone Number ID</Label>
        <Input
          id="phoneNumberId"
          name="phoneNumberId"
          required
          defaultValue={phoneNumberId ?? ""}
          placeholder="1234567890123456"
        />
        <p className="mt-1 text-xs text-faint">
          Meta Business Suite → WhatsApp → API Setup → &quot;Phone number ID&quot;.
        </p>
      </div>
      <div>
        <Label htmlFor="accessToken">Access Token</Label>
        <Input
          id="accessToken"
          name="accessToken"
          type="password"
          autoComplete="off"
          required={!isConnected}
          placeholder={isConnected ? "•••••••••••••• (leave blank to keep current token)" : "EAAxxxxxxxxxxxxx"}
        />
        <p className="mt-1 text-xs text-faint">
          Never shown again once saved — stored encrypted. Paste a new one here to rotate it.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="accent" size="sm" disabled={pending}>
          {pending ? "Saving…" : isConnected ? "Update" : "Connect"}
        </Button>
      </div>
    </form>
  );
}
