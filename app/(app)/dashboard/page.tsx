import { and, count, eq, isNotNull, lte, notInArray, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { customers, leads, stockItems } from "@/db/schema";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await requireUser();

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [[openLeads], [dueToday], [bookedLeads], [dueForService], [lowStock]] = await Promise.all([
    db
      .select({ value: count() })
      .from(leads)
      .where(and(eq(leads.orgId, user.orgId), eq(leads.stage, "new"))),
    db
      .select({ value: count() })
      .from(leads)
      .where(
        and(
          eq(leads.orgId, user.orgId),
          isNotNull(leads.followUpAt),
          lte(leads.followUpAt, endOfToday),
          notInArray(leads.stage, ["booked", "lost"]),
        ),
      ),
    db
      .select({ value: count() })
      .from(leads)
      .where(and(eq(leads.orgId, user.orgId), eq(leads.stage, "booked"))),
    db
      .select({ value: count() })
      .from(customers)
      .where(and(eq(customers.orgId, user.orgId), isNotNull(customers.nextServiceDueAt), lte(customers.nextServiceDueAt, endOfToday))),
    db
      .select({ value: count() })
      .from(stockItems)
      .where(and(eq(stockItems.orgId, user.orgId), sql`${stockItems.quantityOnHand} <= ${stockItems.lowStockThreshold}`)),
  ]);

  const stats = [
    { label: "New leads", value: openLeads?.value ?? 0 },
    { label: "Follow-ups due or overdue", value: dueToday?.value ?? 0 },
    { label: "Booked", value: bookedLeads?.value ?? 0 },
    { label: "Customers due for service", value: dueForService?.value ?? 0 },
    { label: "Low stock items", value: lowStock?.value ?? 0 },
  ];

  return (
    <>
      <PageHeader title={`Welcome back, ${user.fullName.split(" ")[0]}`} description="Here's where things stand today." />
      <div className="flex-1 px-8 py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
