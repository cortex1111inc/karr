"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/input";
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

  return (
    <Select
      disabled={isPending}
      defaultValue={currentAssigneeId ?? "unassigned"}
      aria-label="Assigned staff member"
      onChange={(event) => {
        const value = event.target.value;
        startTransition(() => {
          assignLead(leadId, value);
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
