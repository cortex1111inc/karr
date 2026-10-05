import Link from "next/link";
import { and, asc, count, eq, gte, inArray, isNotNull, lt, lte, notInArray, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { customers, integrations, invoices, leads, orgSites, organizations, payments, profiles, stockItems } from "@/db/schema";
import { growthStats } from "@/lib/growth-stats";
import { formatCurrency } from "@/lib/billing/money";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Delta } from "@/components/ui/delta";
import { GettingStarted, type Step } from "./getting-started";

export const metadata = { title: "Dashboard" };

const DAY = 24 * 60 * 60 * 1000;
const ATTENTION_LIMIT = 5;

export default async function DashboardPage() {
  const user = await requireUser();
  const org = user.orgId;

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const periodStart = new Date(now.getTime() - 30 * DAY);
  const prevStart = new Date(now.getTime() - 60 * DAY);

  const revenueBetween = (from: Date, to: Date) =>
    db
      .select({ value: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .where(and(eq(payments.orgId, org), gte(payments.paidAt, from), lt(payments.paidAt, to)));

  const leadsBetween = (from: Date, to: Date, bookedOnly = false) =>
    db
      .select({ value: count() })
      .from(leads)
      .where(
        and(
          eq(leads.orgId, org),
          gte(leads.createdAt, from),
          lt(leads.createdAt, to),
          bookedOnly ? eq(leads.stage, "booked") : undefined,
        ),
      );

  const [
    [leadsNow],
    [leadsPrev],
    [bookedNow],
    [bookedPrev],
    [revenueNow],
    [revenuePrev],
    [outstanding],
    [dueForService],
    followUps,
    unpaid,
    lowStock,
  ] = await Promise.all([
    leadsBetween(periodStart, now),
    leadsBetween(prevStart, periodStart),
    leadsBetween(periodStart, now, true),
    leadsBetween(prevStart, periodStart, true),
    revenueBetween(periodStart, now),
    revenueBetween(prevStart, periodStart),
    db
      .select({ value: sql<string>`COALESCE(SUM(${invoices.total} - ${invoices.amountPaid}), 0)` })
      .from(invoices)
      .where(and(eq(invoices.orgId, org), inArray(invoices.status, ["sent", "partial"]))),
    db
      .select({ value: count() })
      .from(customers)
      .where(and(eq(customers.orgId, org), isNotNull(customers.nextServiceDueAt), lte(customers.nextServiceDueAt, endOfToday))),
    db
      .select({ id: leads.id, contactName: leads.contactName, interest: leads.interest, followUpAt: leads.followUpAt })
      .from(leads)
      .where(
        and(
          eq(leads.orgId, org),
          isNotNull(leads.followUpAt),
          lte(leads.followUpAt, endOfToday),
          notInArray(leads.stage, ["booked", "lost"]),
        ),
      )
      .orderBy(asc(leads.followUpAt))
      .limit(ATTENTION_LIMIT),
    db
      .select({
        id: invoices.id,
        number: invoices.number,
        contactName: invoices.contactName,
        balance: sql<string>`${invoices.total} - ${invoices.amountPaid}`,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .where(and(eq(invoices.orgId, org), inArray(invoices.status, ["sent", "partial"])))
      .orderBy(asc(invoices.createdAt))
      .limit(ATTENTION_LIMIT),
    db
      .select({ id: stockItems.id, name: stockItems.name, quantityOnHand: stockItems.quantityOnHand, unit: stockItems.unit })
      .from(stockItems)
      .where(and(eq(stockItems.orgId, org), sql`${stockItems.quantityOnHand} <= ${stockItems.lowStockThreshold}`))
      .orderBy(asc(stockItems.quantityOnHand))
      .limit(ATTENTION_LIMIT),
  ]);

  // Getting-started checklist: each step's "done" is derived from real data.
  const [[orgRow], [anyLead], [anyWebLead], [whatsapp], [teamSize], [anyInvoice], [site], growth] = await Promise.all([
    db.select({ dismissedAt: organizations.onboardingDismissedAt }).from(organizations).where(eq(organizations.id, org)),
    db.select({ n: count() }).from(leads).where(eq(leads.orgId, org)),
    db.select({ n: count() }).from(leads).where(and(eq(leads.orgId, org), eq(leads.source, "website"))),
    db.select({ n: count() }).from(integrations).where(and(eq(integrations.orgId, org), eq(integrations.provider, "whatsapp"))),
    db.select({ n: count() }).from(profiles).where(eq(profiles.orgId, org)),
    db.select({ n: count() }).from(invoices).where(eq(invoices.orgId, org)),
    db.select({ published: orgSites.published }).from(orgSites).where(eq(orgSites.orgId, org)),
    growthStats(org, periodStart, now),
  ]);
  const steps: Step[] = [
    { label: "Add your first lead", description: "Log an enquiry from a call, WhatsApp or walk-in.", href: "/leads", done: anyLead.n > 0 },
    { label: "Share your booking link", description: "Put it in your Instagram bio — bookings arrive as leads.", href: "/settings", done: anyWebLead.n > 0 },
    { label: "Connect WhatsApp", description: "Send confirmations and reminders from your own number.", href: "/integrations", done: whatsapp.n > 0 },
    { label: "Invite a teammate", description: "Give staff their own login to handle leads.", href: "/settings/team", done: teamSize.n > 1 },
    { label: "Send your first invoice", description: "Bill a customer with GST, and track what's paid.", href: "/invoices/new", done: anyInvoice.n > 0 },
    { label: "Publish your website", description: "A mobile page with your services and a booking form.", href: "/growth/website", done: Boolean(site?.published) },
  ];
  const showGettingStarted = !orgRow.dismissedAt && steps.some((s) => !s.done);

  const kpis = [
    { label: "Leads in", now: leadsNow.value, prev: leadsPrev.value, fmt: (n: number) => String(n) },
    { label: "Booked", now: bookedNow.value, prev: bookedPrev.value, fmt: (n: number) => String(n) },
    { label: "Revenue collected", now: Number(revenueNow.value), prev: Number(revenuePrev.value), fmt: formatCurrency },
  ];

  const nothingNeedsAttention = followUps.length === 0 && unpaid.length === 0 && lowStock.length === 0;

  return (
    <>
      <PageHeader title={`Welcome back, ${user.fullName.split(" ")[0]}`} description="Last 30 days, and what needs you today." />
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {showGettingStarted ? <GettingStarted steps={steps} canDismiss={user.role === "owner"} /> : null}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label} className="p-4 sm:p-5">
              <p className="text-sm text-muted">{k.label}</p>
              <p className="mt-1 font-mono text-xl font-medium tabular-nums sm:text-2xl">{k.fmt(k.now)}</p>
              <div className="mt-1">
                <Delta current={k.now} previous={k.prev} format={k.fmt} />
              </div>
            </Card>
          ))}
          <Card className="p-4 sm:p-5">
            <p className="text-sm text-muted">Outstanding</p>
            <p className="mt-1 font-mono text-xl font-medium tabular-nums sm:text-2xl">{formatCurrency(Number(outstanding.value))}</p>
            <Link href="/invoices" className="mt-1 inline-block text-xs text-accent-deep hover:underline">
              Unpaid invoices →
            </Link>
          </Card>
        </div>

        <section aria-labelledby="attention-heading" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="attention-heading" className="font-display text-base font-bold">
              Needs attention
            </h2>
            {dueForService.value > 0 ? (
              <Link href="/customers" className="text-sm text-accent-deep hover:underline">
                {dueForService.value} customer{dueForService.value === 1 ? "" : "s"} due for service →
              </Link>
            ) : null}
          </div>

          {nothingNeedsAttention ? (
            <Card className="p-6 text-sm text-muted">Nothing urgent — no follow-ups due, no unpaid invoices, stock is fine.</Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <AttentionList title="Follow-ups due" empty="No follow-ups due." href="/leads">
                {followUps.map((l) => (
                  <AttentionItem key={l.id} href={`/leads/${l.id}`} primary={l.contactName} secondary={l.interest}>
                    <Badge tone={l.followUpAt! < new Date(now.toDateString()) ? "danger" : "accent"}>
                      {l.followUpAt! < new Date(now.toDateString()) ? "Overdue" : "Today"}
                    </Badge>
                  </AttentionItem>
                ))}
              </AttentionList>
              <AttentionList title="Unpaid invoices" empty="Everything's paid." href="/invoices">
                {unpaid.map((i) => (
                  <AttentionItem key={i.id} href={`/invoices/${i.id}`} primary={i.contactName} secondary={i.number}>
                    <span className="font-mono text-xs tabular-nums">{formatCurrency(i.balance)}</span>
                  </AttentionItem>
                ))}
              </AttentionList>
              <AttentionList title="Low stock" empty="Stock levels are fine." href="/inventory">
                {lowStock.map((s) => (
                  <AttentionItem key={s.id} href={`/inventory/${s.id}`} primary={s.name}>
                    <span className="font-mono text-xs tabular-nums text-danger">
                      {s.quantityOnHand} {s.unit}
                    </span>
                  </AttentionItem>
                ))}
              </AttentionList>
            </div>
          )}
        </section>

        {growth.hasLinks ? (
          <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-sm font-bold">From tracking links · last 30 days</h2>
              <p className="mt-1 text-sm text-muted">
                <span className="font-medium text-foreground">{growth.totals.leads}</span> leads ·{" "}
                <span className="font-medium text-foreground">{growth.totals.booked}</span> booked ·{" "}
                <span className="font-medium text-foreground">{formatCurrency(growth.totals.revenue)}</span> revenue
                {growth.totals.commission > 0 ? <> · {formatCurrency(growth.totals.commission)} commission owed</> : null}
              </p>
            </div>
            <Link href="/growth" className="text-sm font-medium text-accent-deep hover:underline">
              See by partner →
            </Link>
          </Card>
        ) : null}
      </div>
    </>
  );
}

function AttentionList({ title, empty, href, children }: { title: string; empty: string; href: string; children: React.ReactNode[] }) {
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Link href={href} className="text-xs text-muted hover:text-foreground">
          View all
        </Link>
      </div>
      {children.length === 0 ? (
        <p className="mt-3 text-sm text-faint">{empty}</p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-border">{children}</ul>
      )}
    </Card>
  );
}

function AttentionItem({ href, primary, secondary, children }: { href: string; primary: string; secondary?: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-surface-2">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{primary}</span>
          {secondary ? <span className="block truncate text-xs text-muted">{secondary}</span> : null}
        </span>
        {children}
      </Link>
    </li>
  );
}
