"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { notifyReadyForPickup } from "../actions";

export function NotifyReadyButton({ leadId }: { leadId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => notifyReadyForPickup(leadId))}
    >
      {isPending ? "Sending…" : "Notify: ready for pickup"}
    </Button>
  );
}
