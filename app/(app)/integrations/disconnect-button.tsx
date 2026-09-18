"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { disconnectWhatsAppIntegration } from "./actions";

export function DisconnectButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("Disconnect WhatsApp? Messages will fall back to the shared credentials (if any) or stop sending.")) return;
        startTransition(() => disconnectWhatsAppIntegration());
      }}
    >
      {isPending ? "Disconnecting…" : "Disconnect"}
    </Button>
  );
}
