"use client";

import { ConfirmButton } from "@/components/ui/dialog";
import { disconnectWhatsAppIntegration } from "./actions";

export function DisconnectButton() {
  return (
    <ConfirmButton
      label="Disconnect"
      pendingLabel="Disconnecting…"
      variant="ghost"
      title="Disconnect WhatsApp?"
      body="Messages will fall back to the shared credentials (if any) or be logged instead of sent."
      confirmLabel="Disconnect"
      successMessage="WhatsApp disconnected"
      onConfirm={() => disconnectWhatsAppIntegration()}
    />
  );
}
