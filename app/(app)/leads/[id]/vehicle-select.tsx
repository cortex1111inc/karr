"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { assignVehicleToLead } from "../actions";

export function VehicleSelect({
  leadId,
  vehicles,
  currentVehicleId,
}: {
  leadId: string;
  vehicles: { id: string; registrationNumber: string }[];
  currentVehicleId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <Select
      disabled={isPending}
      defaultValue={currentVehicleId ?? "none"}
      aria-label="Assigned vehicle"
      onChange={(event) => {
        const value = event.target.value;
        startTransition(async () => {
          await assignVehicleToLead(leadId, value);
          toast("Vehicle updated");
        });
      }}
    >
      <option value="none">No vehicle assigned</option>
      {vehicles.map((vehicle) => (
        <option key={vehicle.id} value={vehicle.id}>
          {vehicle.registrationNumber}
        </option>
      ))}
    </Select>
  );
}
