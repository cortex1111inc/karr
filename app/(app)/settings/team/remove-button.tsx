"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removeTeammate } from "./actions";

export function RemoveButton({ profileId, fullName }: { profileId: string; fullName: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Remove ${fullName} from the workspace?`)) return;
        startTransition(() => {
          removeTeammate(profileId);
        });
      }}
    >
      {isPending ? "Removing…" : "Remove"}
    </Button>
  );
}
