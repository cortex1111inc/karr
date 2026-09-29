"use client";

import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/dialog";
import { deleteVehicle } from "../actions";

export function DeleteVehicleButton({ vehicleId, registrationNumber }: { vehicleId: string; registrationNumber: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      label="Remove vehicle"
      pendingLabel="Removing…"
      title={`Remove ${registrationNumber}?`}
      body="It's removed from the fleet. Bookings that used it keep their history but lose the vehicle link."
      confirmLabel="Remove"
      successMessage="Vehicle removed"
      onConfirm={async () => {
        await deleteVehicle(vehicleId);
        router.push("/vehicles");
      }}
    />
  );
}
