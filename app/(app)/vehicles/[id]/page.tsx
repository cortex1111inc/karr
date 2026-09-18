import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { leads, vehicles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/billing/money";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditVehicleForm } from "./edit-vehicle-form";
import { DeleteVehicleButton } from "./delete-vehicle-button";
import { VehicleStatusSelect } from "../vehicle-status-select";

const STAGE_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  booked: "Booked",
  lost: "Lost",
};

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.id, id), eq(vehicles.orgId, user.orgId)))
    .limit(1);

  if (!vehicle) notFound();

  const bookings = await db
    .select()
    .from(leads)
    .where(and(eq(leads.vehicleId, id), eq(leads.orgId, user.orgId)))
    .orderBy(desc(leads.createdAt));

  return (
    <>
      <PageHeader
        title={vehicle.registrationNumber}
        description={
          <Link href="/vehicles" className="text-sm text-muted hover:text-foreground">
            ← Back to vehicles
          </Link>
        }
        action={<DeleteVehicleButton vehicleId={vehicle.id} registrationNumber={vehicle.registrationNumber} />}
      />
      <div className="flex-1 px-8 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <Card className="p-5">
            <h2 className="font-display text-sm font-bold">Details</h2>
            <EditVehicleForm vehicle={vehicle} />
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="p-5">
              <h2 className="font-display text-sm font-bold">Status</h2>
              <div className="mt-3">
                <VehicleStatusSelect vehicleId={vehicle.id} status={vehicle.status} className="w-full" />
              </div>
              {vehicle.dailyRate ? (
                <p className="mt-3 text-sm text-muted">Daily rate: {formatCurrency(vehicle.dailyRate)}</p>
              ) : null}
            </Card>

            <Card className="p-5">
              <h2 className="font-display text-sm font-bold">Booking history</h2>
              <div className="mt-3 flex flex-col gap-3">
                {bookings.length === 0 ? (
                  <p className="text-sm text-faint">No bookings linked yet.</p>
                ) : (
                  bookings.map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      className="block rounded-lg border border-border p-3 text-sm transition-colors hover:border-border-strong"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{lead.contactName}</span>
                        <Badge tone="neutral">{STAGE_LABEL[lead.stage]}</Badge>
                      </div>
                      <span className="mt-1 block font-mono text-[0.68rem] text-faint">
                        {lead.createdAt.toLocaleDateString()}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
