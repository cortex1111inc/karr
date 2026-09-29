"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { notifyReadyForPickup } from "../actions";

export function NotifyReadyButton({ leadId }: { leadId: string }) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(async () => {
        await notifyReadyForPickup(leadId);
        toast("Pickup message sent");
      })}
    >
      {isPending ? "Sending…" : "Notify: ready for pickup"}
    </Button>
  );
}
