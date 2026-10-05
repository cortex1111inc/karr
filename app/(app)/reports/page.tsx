import { and, eq, gte, inArray, lt, lte, min } from "drizzle-orm";
import { db } from "@/db";
import { invoices, leadStageChanges, leads, payments, profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/billing/money";
import { SOURCE_LABEL, STAGE_LABEL } from "@/lib/leads";
import { funnel, medianDaysToBook, receivablesAging, weekKey } from "@/lib/reports";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Select, Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/ui/bar-chart";
import { Delta } from "@/components/ui/delta";

export const metadata = { title: "Reports" };

const DAY_MS = 86_400_000;

type Totals = { leads: number; booked: number; revenue: number };

async function periodTotals(orgId: string, from: Date, to: Date): Promise<Totals> {
  const [leadRows, payRows] = await Promise.all([
    db
      .select({ stage: leads.stage })
      .from(leads)
      .where(and(eq(leads.orgId, orgId), gte(leads.createdAt, from), lt(leads.createdAt, to))),
    db
      .select({ amount: payments.amount })
      .from(payments)
      .where(and(eq(payments.orgId, orgId), gte(payments.paidAt, from), lt(payments.paidAt, to))),
  ]);
  return {
    leads: leadRows.length,
    booked: leadRows.filter((l) => l.stage === "booked").length,
    revenue: payRows.reduce((s, p) => s + Number(p.amount), 0),
  };
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await requireUser();
  const daysParam = Number((await searchParams).days);
  const days = [7, 30, 90, 365].includes(daysParam) ? daysParam : 30;

  const to = new Date();
  const from = new Date(to.getTime() - days * DAY_MS);
  from.setHours(0, 0, 0, 0);
  const prevFrom = new Date(from.getTime() - days * DAY_MS);
  const org = user.orgId;

  const [leadsInRange, paymentsInRange, orgProfiles, previous, changes, bookedChanges, unpaid, firstHistory] = await Promise.all([
    db
      .select({ id: leads.id, source: leads.source, stage: leads.stage, assignedTo: leads.assignedTo, createdAt: leads.createdAt })
      .from(leads)
      .where(and(eq(leads.orgId, org), gte(leads.createdAt, from), lte(leads.createdAt, to))),
    db
      .select({ amount: payments.amount, paidAt: payments.paidAt, vehicleId: leads.vehicleId })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .leftJoin(leads, eq(invoices.leadId, leads.id))
      .where(and(eq(invoices.orgId, org), gte(payments.paidAt, from), lte(payments.paidAt, to))),
    db.select({ id: profiles.id, fullName: profiles.fullName }).from(profiles).where(eq(profiles.orgId, org)),
    periodTotals(org, prevFrom, from),
    // Stage history for the funnel: every change made in the period.
    db
      .select({ leadId: leadStageChanges.leadId, toStage: leadStageChanges.toStage, changedAt: leadStageChanges.changedAt })
      .from(leadStageChanges)
      .where(and(eq(leadStageChanges.orgId, org), gte(leadStageChanges.changedAt, from), lte(leadStageChanges.changedAt, to)))
      .limit(20000),
    // First time each lead was booked in the period, with when it was created.
    db
      .select({ leadId: leadStageChanges.leadId, bookedAt: min(leadStageChanges.changedAt), createdAt: leads.createdAt })
      .from(leadStageChanges)
      .innerJoin(leads, eq(leadStageChanges.leadId, leads.id))
      .where(
        and(
          eq(leadStageChanges.orgId, org),
          eq(leadStageChanges.toStage, "booked"),
          gte(leadStageChanges.changedAt, from),
          lte(leadStageChanges.changedAt, to),
        ),
      )
      .groupBy(leadStageChanges.leadId, leads.createdAt)
      .limit(5000),
    db
      .select({ total: invoices.total, amountPaid: invoices.amountPaid, createdAt: invoices.createdAt })
      .from(invoices)
      .where(and(eq(invoices.orgId, org), inArray(invoices.status, ["sent", "partial"])))
      .limit(5000),
    // Earliest history row, to tell the owner when funnel data begins.
    db
      .select({ first: min(leadStageChanges.changedAt) })
      .from(leadStageChanges)
      .where(eq(leadStageChanges.orgId, org)),
  ]);

  // ---- KPIs (with previous-period deltas) ----
  const totalLeads = leadsInRange.length;
  const booked = leadsInRange.filter((l) => l.stage === "booked").length;
  const conversionRate = totalLeads > 0 ? (booked / totalLeads) * 100 : 0;
  const prevConversion = previous.leads > 0 ? (previous.booked / previous.leads) * 100 : 0;
  const revenue = paymentsInRange.reduce((s, p) => s + Number(p.amount), 0);
  const avgDeal = booked > 0 ? revenue / booked : 0;
  const prevAvgDeal = previous.booked > 0 ? previous.revenue / previous.booked : 0;

  // ---- Funnel from stage history ----
  const steps = funnel(changes);
  const medianDays = medianDaysToBook(
    bookedChanges.filter((r) => r.bookedAt).map((r) => ({ createdAt: r.createdAt, bookedAt: new Date(r.bookedAt as unknown as string | Date) })),
  );
  const historyStart = firstHistory[0]?.first ? new Date(firstHistory[0].first as unknown as string | Date) : null;
  const historyIncomplete = !historyStart || historyStart > from;

  // ---- Breakdowns ----
  const bySource = new Map<string, { count: number; converted: number }>();
  const byStaff = new Map<string, { count: number; converted: number }>();
  const bump = (m: typeof bySource, key: string, isBooked: boolean) => {
    const b = m.get(key) ?? { count: 0, converted: 0 };
    b.count += 1;
    if (isBooked) b.converted += 1;
    m.set(key, b);
  };
  for (const l of leadsInRange) {
    bump(bySource, l.source, l.stage === "booked");
    bump(byStaff, l.assignedTo ?? "unassigned", l.stage === "booked");
  }
  const rate = (s: { count: number; converted: number }) => (s.count > 0 ? (s.converted / s.count) * 100 : 0);
  const sourceRows = [...bySource.entries()]
    .map(([source, s]) => ({ source, label: SOURCE_LABEL[source as keyof typeof SOURCE_LABEL] ?? source, ...s, rate: rate(s) }))
    .sort((a, b) => b.count - a.count);
  const names = new Map(orgProfiles.map((p) => [p.id, p.fullName]));
  const staffRows = [...byStaff.entries()]
    .map(([id, s]) => ({ name: id === "unassigned" ? "Unassigned" : (names.get(id) ?? "Former staff"), ...s, rate: rate(s) }))
    .sort((a, b) => b.count - a.count);

  // ---- Revenue split and trend ----
  const rentalRevenue = paymentsInRange.filter((p) => p.vehicleId).reduce((s, p) => s + Number(p.amount), 0);
  const revenueByWeek = new Map<string, number>();
  const leadsByWeek = new Map<string, number>();
  for (const p of paymentsInRange) revenueByWeek.set(weekKey(p.paidAt), (revenueByWeek.get(weekKey(p.paidAt)) ?? 0) + Number(p.amount));
  for (const l of leadsInRange) leadsByWeek.set(weekKey(l.createdAt), (leadsByWeek.get(weekKey(l.createdAt)) ?? 0) + 1);
  const weeks = [...new Set([...revenueByWeek.keys(), ...leadsByWeek.keys()])].sort();
  const weekLabel = (k: string) => k.slice(5);

  const aging = receivablesAging(unpaid);
  const outstanding = aging.reduce((s, b) => s + b.amount, 0);

  const kpis = [
    { label: "Leads in", value: String(totalLeads), delta: <Delta current={totalLeads} previous={previous.leads} /> },
    {
      label: "Conversion rate",
      value: `${conversionRate.toFixed(1)}%`,
      delta: <Delta current={conversionRate} previous={prevConversion} format={(n) => `${n.toFixed(1)}%`} />,
    },
    { label: "Revenue collected", value: formatCurrency(revenue), delta: <Delta current={revenue} previous={previous.revenue} format={formatCurrency} /> },
    { label: "Avg. deal size", value: formatCurrency(avgDeal), delta: <Delta current={avgDeal} previous={prevAvgDeal} format={formatCurrency} /> },
  ];

  const isoDay = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Sales performance, revenue, and exportable data."
        action={
          <form method="get" className="flex items-center gap-2">
            <Select name="days" defaultValue={String(days)} className="w-36" aria-label="Date range">
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
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label} className="p-4 sm:p-5">
              <p className="font-mono text-xl font-medium tabular-nums sm:text-2xl">{k.value}</p>
              <p className="mt-1 text-sm text-muted">{k.label}</p>
              <p className="mt-1">{k.delta}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-display text-sm font-bold">Revenue by week</h2>
            <div className="mt-4">
              <BarChart
                label="Revenue collected per week"
                format={formatCurrency}
                data={weeks.map((w) => ({ key: w, label: weekLabel(w), value: revenueByWeek.get(w) ?? 0 }))}
              />
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-display text-sm font-bold">New leads by week</h2>
            <div className="mt-4">
              <BarChart label="New leads per week" data={weeks.map((w) => ({ key: w, label: weekLabel(w), value: leadsByWeek.get(w) ?? 0 }))} />
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="font-display text-sm font-bold">Sales funnel</h2>
          <p className="mt-0.5 text-xs text-faint">
            Leads that reached each stage during this period, from recorded stage changes.
            {medianDays !== null ? ` Median time to book: ${medianDays < 1 ? "under a day" : `${medianDays.toFixed(1)} days`}.` : ""}
          </p>
          <ol className="mt-4 flex flex-col gap-2.5">
            {steps.map((s) => {
              const top = Math.max(1, steps[0].count);
              return (
                <li key={s.stage} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-muted">{STAGE_LABEL[s.stage]}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded bg-surface-2" aria-hidden="true">
                    <div className="h-full rounded bg-accent" style={{ width: `${s.count > 0 ? Math.max(3, (s.count / top) * 100) : 0}%` }} />
                  </div>
                  <span className="w-28 shrink-0 text-right font-mono text-xs tabular-nums">
                    {s.count}
                    {s.stage !== "new" ? <span className="text-faint"> · {s.rate.toFixed(0)}%</span> : null}
                  </span>
                </li>
              );
            })}
          </ol>
          {historyIncomplete ? (
            <p className="mt-3 text-xs text-faint">
              Stage history {historyStart ? `starts ${historyStart.toLocaleDateString("en-IN")}` : "hasn't started yet"} — earlier moves weren&apos;t recorded, so
              this funnel undercounts for periods before then. The conversion rate above uses each lead&apos;s current stage and isn&apos;t affected.
            </p>
          ) : null}
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[
            { title: "Lead sources", hint: "Which channel actually converts.", head: "Source", rows: sourceRows.map((r) => ({ key: r.source, name: r.label, ...r })) },
            { title: "Staff performance", hint: "Leads handled and converted, per assignee.", head: "Staff", rows: staffRows.map((r) => ({ key: r.name, ...r })) },
          ].map((t) => (
            <Card key={t.title} className="p-5">
              <h2 className="font-display text-sm font-bold">{t.title}</h2>
              <p className="mt-0.5 text-xs text-faint">{t.hint}</p>
              <div className="mt-4 overflow-x-auto">
                {t.rows.length === 0 ? (
                  <p className="text-sm text-faint">No leads in this period.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-faint">
                        <th className="pb-2 font-medium">{t.head}</th>
                        <th className="pb-2 font-medium">Leads</th>
                        <th className="pb-2 font-medium">Booked</th>
                        <th className="pb-2 text-right font-medium">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.rows.map((r) => (
                        <tr key={r.key} className="border-b border-border last:border-0">
                          <td className="py-2">{r.name}</td>
                          <td className="py-2 font-mono tabular-nums">{r.count}</td>
                          <td className="py-2 font-mono tabular-nums">{r.converted}</td>
                          <td className="py-2 text-right font-mono tabular-nums">{r.rate.toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                <dd className="font-mono tabular-nums">{formatCurrency(revenue - rentalRevenue)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-sm font-bold">Outstanding receivables</h2>
            <p className="mt-0.5 text-xs text-faint">Unpaid balance on sent and part-paid invoices, by age since issue.</p>
            <p className="mt-3 font-mono text-xl tabular-nums">{formatCurrency(outstanding)}</p>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              {aging.map((b) => (
                <div key={b.label} className="flex justify-between">
                  <dt className="text-muted">
                    {b.label} <span className="text-faint">({b.count})</span>
                  </dt>
                  <dd className={`font-mono tabular-nums ${b.label === "60+ days" && b.amount > 0 ? "text-danger" : ""}`}>{formatCurrency(b.amount)}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <Card className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-sm font-bold">Marketing attribution</h2>
            <p className="mt-0.5 text-sm text-muted">Leads, bookings, revenue and commission per influencer or ad link.</p>
          </div>
          <a href="/growth" className="text-sm font-medium text-accent-deep hover:underline">
            Open Growth →
          </a>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-sm font-bold">Export data</h2>
          <p className="mt-0.5 text-sm text-muted">Full CSV exports ignore the range above — they&apos;re a complete backup for spreadsheets and your accountant.</p>
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
          <form method="get" action="/api/export/invoices" className="mt-5 flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <div>
              <Label htmlFor="export-from">From</Label>
              <Input id="export-from" name="from" type="date" required defaultValue={isoDay(from)} className="w-40" />
            </div>
            <div>
              <Label htmlFor="export-to">To</Label>
              <Input id="export-to" name="to" type="date" required defaultValue={isoDay(to)} className="w-40" />
            </div>
            <Button type="submit" variant="ghost" size="sm">
              Invoices CSV for dates
            </Button>
            <Button type="submit" variant="ghost" size="sm" formAction="/api/export/leads">
              Leads CSV for dates
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
