// growthStats() attribution against a real DB. Gated on TEST_DATABASE_URL.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)("growthStats attribution (real DB)", () => {
  let orgId = "";
  let m: {
    db: typeof import("@/db").db;
    dbClient: typeof import("@/db").dbClient;
    s: typeof import("@/db/schema");
    orm: typeof import("drizzle-orm");
    stats: typeof import("@/lib/growth-stats");
    pay: typeof import("@/lib/billing/payments");
    tok: typeof import("@/lib/tokens");
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    const [dbm, s, orm, stats, pay, tok, slug] = await Promise.all([
      import("@/db"), import("@/db/schema"), import("drizzle-orm"), import("@/lib/growth-stats"),
      import("@/lib/billing/payments"), import("@/lib/tokens"), import("@/lib/slug"),
    ]);
    m = { db: dbm.db, dbClient: dbm.dbClient, s, orm, stats, pay, tok };
    const [org] = await m.db.insert(s.organizations).values({ name: "vitest growth", slug: slug.uniqueSlug("vitest-growth") }).returning();
    orgId = org.id;
  });

  afterAll(async () => {
    if (!m) return;
    if (orgId) await m.db.delete(m.s.organizations).where(m.orm.eq(m.s.organizations.id, orgId));
    await m.dbClient.end();
  });

  it("credits clicks, leads, bookings, revenue (incl. customer first-touch) and commission to the right link", async () => {
    const { s, db } = m;
    const [rahul] = await db.insert(s.trackingLinks).values({ orgId, name: "Rahul", code: "rahul", commissionType: "flat", commissionValue: "200" }).returning();
    const [ads] = await db.insert(s.trackingLinks).values({ orgId, name: "IG ads", code: "ig", channel: "instagram_ads", commissionType: "percent", commissionValue: "10" }).returning();
    const [old] = await db.insert(s.trackingLinks).values({ orgId, name: "Old", code: "old", archivedAt: new Date() }).returning();

    await db.insert(s.trackingLinkClicks).values([
      { orgId, trackingLinkId: rahul.id }, { orgId, trackingLinkId: rahul.id }, { orgId, trackingLinkId: ads.id },
    ]);

    const [customer] = await db.insert(s.customers).values({ orgId, fullName: "Cust", phone: "1" }).returning();
    const lead = (link: string, stage: "new" | "booked", customerId: string | null = null) => ({
      orgId, contactName: "L", contactPhone: "1", interest: "x", stage, trackingLinkId: link, customerId, publicToken: m.tok.generatePublicToken(),
    });
    const [rahulBooked] = await db.insert(s.leads).values(lead(rahul.id, "booked", customer.id)).returning();
    await db.insert(s.leads).values([lead(rahul.id, "new"), lead(ads.id, "booked")]);

    const invoice = async (leadId: string | null, customerId: string | null, total: number) =>
      (await db.insert(s.invoices).values({
        orgId, leadId, customerId, number: `G-${Math.random().toString(36).slice(2, 8)}`, contactName: "C", contactPhone: "1",
        subtotal: String(total), total: String(total), publicToken: m.tok.generatePublicToken(), status: "sent",
      }).returning())[0].id;

    // 1) invoice tied to Rahul's lead
    const inv1 = await invoice(rahulBooked.id, null, 3000);
    await m.pay.applyPayment({ orgId, invoiceId: inv1, amount: 3000, method: "cash" });
    // 2) invoice raised from the customer page (no lead) — first-touch → Rahul
    const inv2 = await invoice(null, customer.id, 1000);
    await m.pay.applyPayment({ orgId, invoiceId: inv2, amount: 1000, method: "upi" });
    // 3) unattributed invoice — must not be credited to anyone
    const inv3 = await invoice(null, null, 5000);
    await m.pay.applyPayment({ orgId, invoiceId: inv3, amount: 5000, method: "cash" });

    const from = new Date(Date.now() - 86_400_000);
    const to = new Date(Date.now() + 60_000);
    const { rows, totals } = await m.stats.growthStats(orgId, from, to);
    const byName = Object.fromEntries(rows.map((r) => [r.link.name, r]));

    expect(byName.Rahul).toMatchObject({ clicks: 2, leads: 2, booked: 1, revenue: 4000, commission: 200 });
    expect(byName.Rahul.conversion).toBe(50);
    expect(byName["IG ads"]).toMatchObject({ clicks: 1, leads: 1, booked: 1, revenue: 0, commission: 0 });
    expect(byName.Old).toBeUndefined(); // archived with no activity → hidden
    expect(totals.revenue).toBe(4000); // the ₹5000 unattributed payment isn't counted
    void old;
  });
});
