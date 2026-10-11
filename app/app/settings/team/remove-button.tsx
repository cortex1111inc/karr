"use client";

import { ConfirmButton } from "@/components/ui/dialog";
import { removeTeammate } from "./actions";

export function RemoveButton({ profileId, fullName }: { profileId: string; fullName: string }) {
  return (
    <ConfirmButton
      label="Remove"
      pendingLabel="Removing…"
      variant="ghost"
      title={`Remove ${fullName}?`}
      body="They lose access to this workspace immediately. Leads assigned to them become unassigned."
      confirmLabel="Remove"
      successMessage={`${fullName} removed`}
      onConfirm={() => removeTeammate(profileId)}
    />
  );
}
