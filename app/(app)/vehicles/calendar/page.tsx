import { and, asc, eq, gte, isNotNull, lte, ne, notInArray } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { leads, vehicles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Fleet calendar" };

const DAY_MS = 86_400_000;

// Dates are handled as UTC YYYY-MM-DD strings, matching the `date` columns.
function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function mondayOf(value: string | undefined): Date {
  const parsed = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date();
  const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const offset = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(d.getTime() - offset * DAY_MS);
}

export default async function VehicleCalendarPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const user = await requireUser();
  const start = mondayOf((await searchParams).week);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY_MS));
  const first = iso(days[0]);
  const last = iso(days[6]);
  const today = iso(new Date());

  const [fleet, bookings] = await Promise.all([
    db
      .select({ id: vehicles.id, reg: vehicles.registrationNumber, make: vehicles.make, model: vehicles.model, status: vehicles.status })
      .from(vehicles)
      .where(and(eq(vehicles.orgId, user.orgId), ne(vehicles.status, "retired")))
      .orderBy(asc(vehicles.registrationNumber))
      .limit(200),
    db
      .select({
        id: leads.id,
        vehicleId: leads.vehicleId,
        contactName: leads.contactName,
        stage: leads.stage,
        rentalStart: leads.rentalStart,
        rentalEnd: leads.rentalEnd,
      })
      .from(leads)
      .where(
        and(
          eq(leads.orgId, user.orgId),
          isNotNull(leads.vehicleId),
          notInArray(leads.stage, ["lost"]),
          lte(leads.rentalStart, last),
          gte(leads.rentalEnd, first),
        ),
      )
      .limit(2000),
  ]);

  const byVehicle = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const list = byVehicle.get(b.vehicleId!) ?? [];
    list.push(b);
    byVehicle.set(b.vehicleId!, list);
  }

  const prev = iso(new Date(start.getTime() - 7 * DAY_MS));
  const next = iso(new Date(start.getTime() + 7 * DAY_MS));
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <>
      <PageHeader
        title="Fleet calendar"
        description={
          <Link href="/vehicles" className="text-sm text-muted hover:text-foreground">
            ← Vehicles
          </Link>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href={`/vehicles/calendar?week=${prev}`} variant="ghost" size="sm" aria-label="Previous week">
              ←
            </ButtonLink>
            <ButtonLink href="/vehicles/calendar" variant="ghost" size="sm">
              This week
            </ButtonLink>
            <ButtonLink href={`/vehicles/calendar?week=${next}`} variant="ghost" size="sm" aria-label="Next week">
              →
            </ButtonLink>
          </div>
        }
      />
      <div className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        {fleet.length === 0 ? (
          <EmptyState title="No vehicles yet" description="Add vehicles, then give bookings rental dates to see them here." />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[760px] table-fixed text-sm">
              <caption className="sr-only">
                Bookings from {first} to {last}
              </caption>
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-xs">
                  <th scope="col" className="w-36 p-2.5 font-medium text-faint">
                    Vehicle
                  </th>
                  {days.map((d) => (
                    <th
                      key={iso(d)}
                      scope="col"
                      className={`p-2.5 font-medium ${iso(d) === today ? "text-accent-deep" : "text-faint"}`}
                    >
                      {fmt(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fleet.map((v) => {
                  const list = byVehicle.get(v.id) ?? [];
                  return (
                    <tr key={v.id} className="border-b border-border last:border-0">
                      <th scope="row" className="p-2.5 text-left align-top font-normal">
                        <Link href={`/vehicles/${v.id}`} className="font-mono text-xs font-semibold hover:text-accent-deep">
                          {v.reg}
                        </Link>
                        <p className="truncate text-xs text-faint">{[v.make, v.model].filter(Boolean).join(" ") || v.status}</p>
                      </th>
                      {days.map((d) => {
                        const day = iso(d);
                        const booking = list.find((b) => b.rentalStart! <= day && b.rentalEnd! >= day);
                        return (
                          <td key={day} className="h-14 p-1 align-top">
                            {booking ? (
                              <Link
                                href={`/leads/${booking.id}`}
                                title={`${booking.contactName} · ${booking.rentalStart} to ${booking.rentalEnd}`}
                                className={`block h-full truncate rounded-md px-2 py-1 text-xs ${
                                  booking.stage === "booked" ? "bg-accent-soft text-accent-deep" : "border border-dashed border-border-strong text-muted"
                                }`}
                              >
                                {booking.contactName}
                              </Link>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
        <p className="text-xs text-faint">
          Solid = booked; dashed = tentative (lead not booked yet). Set rental dates on a lead to place it here.
        </p>
      </div>
    </>
  );
}
