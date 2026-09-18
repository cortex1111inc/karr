import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { invoices, leads, payments, profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/billing/money";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SOURCE_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  call: "Call",
  website: "Website",
  walk_in: "Walk-in",
  referral: "Referral",
  other: "Other",
};

function weekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const user = await requireUser();
  const { days: daysParam } = await searchParams;
  const days = Number(daysParam) > 0 ? Number(daysParam) : 30;

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const [leadsInRange, paymentsInRange, orgProfiles] = await Promise.all([
    db
      .select({
        id: leads.id,
        source: leads.source,
        stage: leads.stage,
        assignedTo: leads.assignedTo,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(and(eq(leads.orgId, user.orgId), gte(leads.createdAt, from), lte(leads.createdAt, to))),
    db
      .select({
        id: payments.id,
        amount: payments.amount,
        paidAt: payments.paidAt,
        vehicleId: leads.vehicleId,
      })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .leftJoin(leads, eq(invoices.leadId, leads.id))
      .where(and(eq(invoices.orgId, user.orgId), gte(payments.paidAt, from), lte(payments.paidAt, to))),
    db.select({ id: profiles.id, fullName: profiles.fullName }).from(profiles).where(eq(profiles.orgId, user.orgId)),
  ]);

  // ---- KPIs ----
  const totalLeads = leadsInRange.length;
  const converted = leadsInRange.filter((l) => l.stage === "booked").length;
  const conversionRate = totalLeads > 0 ? (converted / totalLeads) * 100 : 0;
  const revenue = paymentsInRange.reduce((sum, p) => sum + Number(p.amount), 0);
  const avgDealSize = converted > 0 ? revenue / converted : 0;

  // ---- Lead source breakdown ----
  const bySource = new Map<string, { count: number; converted: number }>();
  for (const lead of leadsInRange) {
    const bucket = bySource.get(lead.source) ?? { count: 0, converted: 0 };
    bucket.count += 1;
    if (lead.stage === "booked") bucket.converted += 1;
    bySource.set(lead.source, bucket);
  }
  const sourceRows = [...bySource.entries()]
    .map(([source, stats]) => ({
      source,
      label: SOURCE_LABEL[source] ?? source,
      ...stats,
      rate: stats.count > 0 ? (stats.converted / stats.count) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // ---- Staff performance ----
  const profileNames = new Map(orgProfiles.map((p) => [p.id, p.fullName]));
  const byStaff = new Map<string, { count: number; converted: number }>();
  for (const lead of leadsInRange) {
    const key = lead.assignedTo ?? "unassigned";
    const bucket = byStaff.get(key) ?? { count: 0, converted: 0 };
    bucket.count += 1;
    if (lead.stage === "booked") bucket.converted += 1;
    byStaff.set(key, bucket);
  }
  const staffRows = [...byStaff.entries()]
    .map(([id, stats]) => ({
      name: id === "unassigned" ? "Unassigned" : (profileNames.get(id) ?? "Former staff"),
      ...stats,
      rate: stats.count > 0 ? (stats.converted / stats.count) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // ---- Revenue by type (rental vs. service/other, proxied via leads.vehicleId) ----
  const rentalRevenue = paymentsInRange.filter((p) => p.vehicleId).reduce((sum, p) => sum + Number(p.amount), 0);
  const serviceRevenue = revenue - rentalRevenue;

  // ---- Revenue by week ----
  const byWeek = new Map<string, number>();
  for (const payment of paymentsInRange) {
    const key = weekStart(payment.paidAt);
    byWeek.set(key, (byWeek.get(key) ?? 0) + Number(payment.amount));
  }
  const weekRows = [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b));
  const maxWeekRevenue = Math.max(1, ...weekRows.map(([, amount]) => amount));

  return (
    <>
      <PageHeader
        title="Reports"
        description="Sales performance, revenue, and exportable data."
        action={
          <form method="get" className="flex items-center gap-2">
            <Select name="days" defaultValue={String(days)} className="w-36">
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last 12 months</option>
            </Select>
            <Button type="submit" variant="ghost" size="sm">
              Apply
            </Button>
          </form>
        }
      />
      <div className="flex-1 px-8 py-6">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="font-mono text-2xl font-medium tabular-nums">{totalLeads}</p>
              <p className="mt-1 text-sm text-muted">Leads in</p>
            </Card>
            <Card className="p-5">
              <p className="font-mono text-2xl font-medium tabular-nums">{conversionRate.toFixed(1)}%</p>
              <p className="mt-1 text-sm text-muted">Conversion rate</p>
            </Card>
            <Card className="p-5">
              <p className="font-mono text-2xl font-medium tabular-nums">{formatCurrency(revenue)}</p>
              <p className="mt-1 text-sm text-muted">Revenue collected</p>
            </Card>
            <Card className="p-5">
              <p className="font-mono text-2xl font-medium tabular-nums">{formatCurrency(avgDealSize)}</p>
              <p className="mt-1 text-sm text-muted">Avg. deal size</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="font-display text-sm font-bold">Lead sources</h2>
              <p className="mt-0.5 text-xs text-faint">Which channel actually converts.</p>
              <div className="mt-4 overflow-x-auto">
                {sourceRows.length === 0 ? (
                  <p className="text-sm text-faint">No leads in this period.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-faint">
                        <th className="pb-2 font-medium">Source</th>
                        <th className="pb-2 font-medium">Leads</th>
                        <th className="pb-2 font-medium">Booked</th>
                        <th className="pb-2 text-right font-medium">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceRows.map((row) => (
                        <tr key={row.source} className="border-b border-border last:border-0">
                          <td className="py-2">{row.label}</td>
                          <td className="py-2 font-mono tabular-nums">{row.count}</td>
                          <td className="py-2 font-mono tabular-nums">{row.converted}</td>
                          <td className="py-2 text-right font-mono tabular-nums">{row.rate.toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-display text-sm font-bold">Staff performance</h2>
              <p className="mt-0.5 text-xs text-faint">Leads handled and converted, per assignee.</p>
              <div className="mt-4 overflow-x-auto">
                {staffRows.length === 0 ? (
                  <p className="text-sm text-faint">No leads in this period.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-faint">
                        <th className="pb-2 font-medium">Staff</th>
                        <th className="pb-2 font-medium">Leads</th>
                        <th className="pb-2 font-medium">Booked</th>
                        <th className="pb-2 text-right font-medium">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffRows.map((row) => (
                        <tr key={row.name} className="border-b border-border last:border-0">
                          <td className="py-2">{row.name}</td>
                          <td className="py-2 font-mono tabular-nums">{row.count}</td>
                          <td className="py-2 font-mono tabular-nums">{row.converted}</td>
                          <td className="py-2 text-right font-mono tabular-nums">{row.rate.toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            <Card className="p-5">
              <h2 className="font-display text-sm font-bold">Revenue by type</h2>
              <p className="mt-0.5 text-xs text-faint">Rental jobs vs. service/other, by whether a vehicle was linked.</p>
              <dl className="mt-4 flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Rental</dt>
                  <dd className="font-mono tabular-nums">{formatCurrency(rentalRevenue)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Service / other</dt>
                  <dd className="font-mono tabular-nums">{formatCurrency(serviceRevenue)}</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-5">
              <h2 className="font-display text-sm font-bold">Revenue by week</h2>
              <div className="mt-4 flex flex-col gap-2.5">
                {weekRows.length === 0 ? (
                  <p className="text-sm text-faint">No payments in this period.</p>
                ) : (
                  weekRows.map(([week, amount]) => (
                    <div key={week} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 font-mono text-xs text-faint">{week}</span>
                      <div className="h-5 flex-1 overflow-hidden rounded bg-surface-2">
                        <div
                          className="h-full rounded bg-accent"
                          style={{ width: `${Math.max(4, (amount / maxWeekRevenue) * 100)}%` }}
                        />
                      </div>
                      <span className="w-24 shrink-0 text-right font-mono text-xs tabular-nums">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="font-display text-sm font-bold">Export data</h2>
            <p className="mt-0.5 text-sm text-muted">Full CSV export — not limited to the date range above.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a href="/api/export/leads" className="text-sm font-medium text-accent-deep hover:underline">
                Leads CSV →
              </a>
              <a href="/api/export/customers" className="text-sm font-medium text-accent-deep hover:underline">
                Customers CSV →
              </a>
              <a href="/api/export/invoices" className="text-sm font-medium text-accent-deep hover:underline">
                Invoices CSV →
              </a>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
