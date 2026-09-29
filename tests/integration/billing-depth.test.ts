// Real-database tests for stock-linked invoices and rental conflicts.
// Gated on TEST_DATABASE_URL; throwaway orgs, deleted afterwards.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)("billing depth (real DB)", () => {
  let orgId = "";
  let otherOrgId = "";
  let m: {
    db: typeof import("@/db").db;
    dbClient: typeof import("@/db").dbClient;
    schema: typeof import("@/db/schema");
    orm: typeof import("drizzle-orm");
    invoices: typeof import("@/lib/billing/invoices");
    rentals: typeof import("@/lib/rentals");
    tokens: typeof import("@/lib/tokens");
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    const [dbm, schema, orm, invoices, rentals, tokens, slug] = await Promise.all([
      import("@/db"),
      import("@/db/schema"),
      import("drizzle-orm"),
      import("@/lib/billing/invoices"),
      import("@/lib/rentals"),
      import("@/lib/tokens"),
      import("@/lib/slug"),
    ]);
    m = { db: dbm.db, dbClient: dbm.dbClient, schema, orm, invoices, rentals, tokens };
    const [org] = await m.db
      .insert(schema.organizations)
      .values({ name: "vitest org", slug: slug.uniqueSlug("vitest") })
      .returning({ id: schema.organizations.id });
    const [other] = await m.db
      .insert(schema.organizations)
      .values({ name: "vitest other", slug: slug.uniqueSlug("vitest") })
      .returning({ id: schema.organizations.id });
    orgId = org.id;
    otherOrgId = other.id;
  });

  afterAll(async () => {
    if (!m) return;
    await m.db.delete(m.schema.organizations).where(m.orm.inArray(m.schema.organizations.id, [orgId, otherOrgId]));
    await m.dbClient.end();
  });

  async function stockItem(qty: number, org = orgId) {
    const [item] = await m.db
      .insert(m.schema.stockItems)
      .values({ orgId: org, name: `Filter ${Math.random().toString(36).slice(2, 6)}`, quantityOnHand: qty })
      .returning({ id: m.schema.stockItems.id });
    return item.id;
  }
  const onHand = async (id: string) =>
    (await m.db.select({ q: m.schema.stockItems.quantityOnHand }).from(m.schema.stockItems).where(m.orm.eq(m.schema.stockItems.id, id)))[0].q;

  const header = {
    customerId: null,
    contactName: "T",
    contactPhone: "0000000",
    notes: null,
    gstEnabled: true,
    gstRate: 18,
    placeOfSupply: "32",
    customerGstin: null,
    interState: false,
  };
  const creator = null;

  it("decrements linked stock and restores it on void, takes it again on un-void", async () => {
    const item = await stockItem(10);
    const res = await m.invoices.createInvoiceRecord({
      orgId,
      createdBy: creator,
      header,
      items: [
        { description: "Filter", quantity: 3, unitPrice: 100, hsnSac: "8421", stockItemId: item },
        { description: "Labour", quantity: 1, unitPrice: 500, hsnSac: null, stockItemId: null },
      ],
    });
    expect(res.ok).toBe(true);
    expect(await onHand(item)).toBe(7);
    if (!res.ok) return;

    const [inv] = await m.db.select().from(m.schema.invoices).where(m.orm.eq(m.schema.invoices.id, res.id));
    expect(Number(inv.total)).toBe(944); // (300 + 500) * 1.18

    expect((await m.invoices.moveInvoiceStock({ orgId, invoiceId: res.id, direction: "return", createdBy: creator })).ok).toBe(true);
    expect(await onHand(item)).toBe(10);
    expect((await m.invoices.moveInvoiceStock({ orgId, invoiceId: res.id, direction: "take", createdBy: creator })).ok).toBe(true);
    expect(await onHand(item)).toBe(7);
  });

  it("writes nothing (not even a number) when a line is short on stock", async () => {
    const item = await stockItem(2);
    const [{ counter: before }] = await m.db
      .select({ counter: m.schema.organizations.invoiceCounter })
      .from(m.schema.organizations)
      .where(m.orm.eq(m.schema.organizations.id, orgId));
    const res = await m.invoices.createInvoiceRecord({
      orgId,
      createdBy: creator,
      header,
      items: [{ description: "Filter", quantity: 5, unitPrice: 100, hsnSac: null, stockItemId: item }],
    });
    expect(res.ok).toBe(false);
    expect(await onHand(item)).toBe(2);
    const [{ counter: after }] = await m.db
      .select({ counter: m.schema.organizations.invoiceCounter })
      .from(m.schema.organizations)
      .where(m.orm.eq(m.schema.organizations.id, orgId));
    expect(after).toBe(before);
  });

  it("ignores another org's stock item id instead of decrementing it", async () => {
    const foreign = await stockItem(10, otherOrgId);
    const res = await m.invoices.createInvoiceRecord({
      orgId,
      createdBy: creator,
      header,
      items: [{ description: "Filter", quantity: 1, unitPrice: 100, hsnSac: null, stockItemId: foreign }],
    });
    expect(res.ok).toBe(true);
    expect(await onHand(foreign)).toBe(10);
  });

  it("detects overlapping rentals on the same vehicle and returns finished ones", async () => {
    const [v] = await m.db
      .insert(m.schema.vehicles)
      .values({ orgId, registrationNumber: `KL-T-${Math.random().toString(36).slice(2, 6)}`, status: "rented" })
      .returning({ id: m.schema.vehicles.id });
    const lead = async (start: string, end: string, stage: "booked" | "lost" = "booked") =>
      (
        await m.db
          .insert(m.schema.leads)
          .values({
            orgId,
            contactName: "R",
            contactPhone: "0",
            interest: "car",
            stage,
            vehicleId: v.id,
            rentalStart: start,
            rentalEnd: end,
            publicToken: m.tokens.generatePublicToken(),
          })
          .returning({ id: m.schema.leads.id })
      )[0].id;

    await lead("2020-01-01", "2020-01-05");
    await lead("2020-01-10", "2020-01-12", "lost");
    const probe = { orgId, vehicleId: v.id, excludeLeadId: crypto.randomUUID() };
    expect(await m.rentals.findVehicleConflict({ ...probe, rentalStart: "2020-01-05", rentalEnd: "2020-01-07" })).not.toBeNull();
    expect(await m.rentals.findVehicleConflict({ ...probe, rentalStart: "2020-01-06", rentalEnd: "2020-01-09" })).toBeNull();
    // lost leads don't hold the vehicle
    expect(await m.rentals.findVehicleConflict({ ...probe, rentalStart: "2020-01-11", rentalEnd: "2020-01-11" })).toBeNull();

    await m.rentals.returnFinishedRentals();
    const [after] = await m.db.select({ status: m.schema.vehicles.status }).from(m.schema.vehicles).where(m.orm.eq(m.schema.vehicles.id, v.id));
    expect(after.status).toBe("available");
  });
});
