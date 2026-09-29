import "server-only";
import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { invoices, leads, payments, trackingLinkClicks, trackingLinks } from "@/db/schema";
import { commissionOwed } from "@/lib/growth";

export type LinkRow = {
  link: typeof trackingLinks.$inferSelect;
  clicks: number;
  leads: number;
  booked: number;
  revenue: number;
  conversion: number;
  commission: number;
};

// Per-link performance for a period. Attribution: a payment counts toward
// the link on its invoice's lead; failing that, toward the link that first
// brought in the invoice's customer (first-touch) — many invoices are raised
// from the customer page with no lead attached.
export async function growthStats(orgId: string, from: Date, to: Date) {
  const [links, clicks, periodLeads, everAttributed, paymentRows] = await Promise.all([
    db.select().from(trackingLinks).where(eq(trackingLinks.orgId, orgId)),
    db
      .select({ linkId: trackingLinkClicks.trackingLinkId })
      .from(trackingLinkClicks)
      .where(and(eq(trackingLinkClicks.orgId, orgId), gte(trackingLinkClicks.clickedAt, from), lte(trackingLinkClicks.clickedAt, to))),
    db
      .select({ linkId: leads.trackingLinkId, stage: leads.stage })
      .from(leads)
      .where(and(eq(leads.orgId, orgId), isNotNull(leads.trackingLinkId), gte(leads.createdAt, from), lte(leads.createdAt, to))),
    db
      .select({ id: leads.id, customerId: leads.customerId, linkId: leads.trackingLinkId, createdAt: leads.createdAt })
      .from(leads)
      .where(and(eq(leads.orgId, orgId), isNotNull(leads.trackingLinkId))),
    db
      .select({ amount: payments.amount, leadId: invoices.leadId, customerId: invoices.customerId })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .where(and(eq(payments.orgId, orgId), gte(payments.paidAt, from), lte(payments.paidAt, to))),
  ]);

  const linkByLead = new Map(everAttributed.map((l) => [l.id, l.linkId!]));
  const linkByCustomer = new Map<string, string>();
  for (const l of [...everAttributed].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    if (l.customerId && !linkByCustomer.has(l.customerId)) linkByCustomer.set(l.customerId, l.linkId!);
  }

  const acc = new Map<string, { clicks: number; leads: number; booked: number; revenue: number }>();
  const get = (id: string) => {
    let s = acc.get(id);
    if (!s) acc.set(id, (s = { clicks: 0, leads: 0, booked: 0, revenue: 0 }));
    return s;
  };
  for (const c of clicks) get(c.linkId).clicks += 1;
  for (const l of periodLeads) {
    const s = get(l.linkId!);
    s.leads += 1;
    if (l.stage === "booked") s.booked += 1;
  }
  for (const p of paymentRows) {
    const linkId = (p.leadId && linkByLead.get(p.leadId)) || (p.customerId && linkByCustomer.get(p.customerId)) || null;
    if (linkId) get(linkId).revenue += Number(p.amount);
  }

  const rows: LinkRow[] = links
    .map((link) => {
      const s = acc.get(link.id) ?? { clicks: 0, leads: 0, booked: 0, revenue: 0 };
      return {
        link,
        ...s,
        conversion: s.leads > 0 ? (s.booked / s.leads) * 100 : 0,
        commission: commissionOwed(link.commissionType, link.commissionValue ? Number(link.commissionValue) : null, s.booked, s.revenue),
      };
    })
    .filter((r) => !r.link.archivedAt || r.clicks + r.leads + r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue || b.leads - a.leads);

  const totals = rows.reduce(
    (t, r) => ({ clicks: t.clicks + r.clicks, leads: t.leads + r.leads, booked: t.booked + r.booked, revenue: t.revenue + r.revenue, commission: t.commission + r.commission }),
    { clicks: 0, leads: 0, booked: 0, revenue: 0, commission: 0 },
  );

  return { hasLinks: links.length > 0, rows, totals };
}
