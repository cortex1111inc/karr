"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "./actions";

export function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => markAllNotificationsRead())}
    >
      {isPending ? "Marking…" : "Mark all read"}
    </Button>
  );
}
