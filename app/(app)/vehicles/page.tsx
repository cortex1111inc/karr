import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewVehicleDialog } from "./new-vehicle-dialog";
import { VehicleStatusSelect } from "./vehicle-status-select";

const STATUS_TONE: Record<string, "neutral" | "accent" | "danger"> = {
  available: "accent",
  rented: "neutral",
  maintenance: "danger",
  retired: "neutral",
};

export default async function VehiclesPage() {
  const user = await requireUser();

  const rows = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.orgId, user.orgId))
    .orderBy(asc(vehicles.registrationNumber));

  return (
    <>
      <PageHeader title="Vehicles" description="Your rental fleet." action={<NewVehicleDialog />} />
      <div className="flex-1 px-8 py-6">
        {rows.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted">No vehicles yet.</Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((vehicle) => (
              <Card key={vehicle.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/vehicles/${vehicle.id}`} className="min-w-0">
                    <p className="font-mono text-sm font-semibold hover:text-accent-deep">{vehicle.registrationNumber}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {[vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.category || "—"}
                    </p>
                  </Link>
                  <Badge tone={STATUS_TONE[vehicle.status]}>{vehicle.status}</Badge>
                </div>
                <div className="mt-3">
                  <VehicleStatusSelect vehicleId={vehicle.id} status={vehicle.status} className="h-8 w-full text-xs" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
