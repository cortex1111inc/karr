"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/input";
import { updateVehicleStatus } from "./actions";

const STATUSES = ["available", "rented", "maintenance", "retired"] as const;

export function VehicleStatusSelect({ vehicleId, status, className }: { vehicleId: string; status: string; className?: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      className={className ?? "w-32"}
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as (typeof STATUSES)[number];
        startTransition(() => updateVehicleStatus(vehicleId, next));
      }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s[0].toUpperCase() + s.slice(1)}
        </option>
      ))}
    </Select>
  );
}
