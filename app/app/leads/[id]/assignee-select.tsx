"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { assignLead } from "../actions";

export function AssigneeSelect({
  leadId,
  profiles,
  currentAssigneeId,
}: {
  leadId: string;
  profiles: { id: string; fullName: string }[];
  currentAssigneeId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <Select
      disabled={isPending}
      defaultValue={currentAssigneeId ?? "unassigned"}
      aria-label="Assigned staff member"
      onChange={(event) => {
        const value = event.target.value;
        startTransition(async () => {
          await assignLead(leadId, value);
          toast("Assignee updated");
        });
      }}
    >
      <option value="unassigned">Unassigned</option>
      {profiles.map((profile) => (
        <option key={profile.id} value={profile.id}>
          {profile.fullName}
        </option>
      ))}
    </Select>
  );
}
