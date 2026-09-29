"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { setTrackingLinkArchived } from "./actions";

export function ArchiveButton({ linkId, archived }: { linkId: string; archived: boolean }) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await setTrackingLinkArchived(linkId, !archived);
          toast(archived ? "Link restored" : "Link archived");
        })
      }
      className="text-xs text-muted hover:text-foreground disabled:opacity-50"
    >
      {archived ? "Restore" : "Archive"}
    </button>
  );
}
