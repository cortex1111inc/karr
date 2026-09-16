import { and, count, eq, gte } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await requireUser();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [[openLeads], [dueToday], [bookedLeads]] = await Promise.all([
    db
      .select({ value: count() })
      .from(leads)
      .where(and(eq(leads.orgId, user.orgId), eq(leads.stage, "new"))),
    db
      .select({ value: count() })
      .from(leads)
      .where(and(eq(leads.orgId, user.orgId), gte(leads.followUpAt, startOfToday))),
    db
      .select({ value: count() })
      .from(leads)
      .where(and(eq(leads.orgId, user.orgId), eq(leads.stage, "booked"))),
  ]);

  const stats = [
    { label: "New leads", value: openLeads?.value ?? 0 },
    { label: "Follow-ups due today", value: dueToday?.value ?? 0 },
    { label: "Booked", value: bookedLeads?.value ?? 0 },
  ];

  return (
    <>
      <PageHeader title={`Welcome back, ${user.fullName.split(" ")[0]}`} description="Here's where things stand today." />
      <div className="flex-1 px-8 py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-5">
              <p className="font-mono text-2xl font-medium tabular-nums">{stat.value}</p>
              <p className="mt-1 text-sm text-muted">{stat.label}</p>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
