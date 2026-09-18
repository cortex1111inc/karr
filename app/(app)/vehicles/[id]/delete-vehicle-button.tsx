"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteVehicle } from "../actions";

export function DeleteVehicleButton({ vehicleId, registrationNumber }: { vehicleId: string; registrationNumber: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="danger"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Remove ${registrationNumber} from the fleet?`)) return;
        startTransition(async () => {
          await deleteVehicle(vehicleId);
          router.push("/vehicles");
        });
      }}
    >
      {isPending ? "Removing…" : "Remove vehicle"}
    </Button>
  );
}
