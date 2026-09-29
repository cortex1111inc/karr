// Real-database tests for the logic most likely to break under concurrency:
// document numbering, payment status, stock decrements.
//
// Gated on TEST_DATABASE_URL — skipped (not failed) when unset, and never
// falls back to DATABASE_URL. Each run creates a throwaway organization and
// deletes it afterwards; every table cascades from organizations, so nothing
// is left behind.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)("billing & inventory (real DB)", () => {
  let orgId = "";
  let otherOrgId = "";
  // Loaded after DATABASE_URL is pointed at the test DB (db/index.ts reads it at import).
  let m: {
    db: typeof import("@/db").db;
    dbClient: typeof import("@/db").dbClient;
    schema: typeof import("@/db/schema");
    orm: typeof import("drizzle-orm");
    numbering: typeof import("@/lib/billing/numbering");
    payments: typeof import("@/lib/billing/payments");
    stock: typeof import("@/lib/inventory/stock");
    tokens: typeof import("@/lib/tokens");
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    const [dbm, schema, orm, numbering, payments, stock, tokens, slug] = await Promise.all([
      import("@/db"),
      import("@/db/schema"),
      import("drizzle-orm"),
      import("@/lib/billing/numbering"),
      import("@/lib/billing/payments"),
      import("@/lib/inventory/stock"),
      import("@/lib/tokens"),
      import("@/lib/slug"),
    ]);
    m = { db: dbm.db, dbClient: dbm.dbClient, schema, orm, numbering, payments, stock, tokens };

    const [org] = await m.db
      .insert(schema.organizations)
      .values({ name: "vitest org", slug: slug.uniqueSlug("vitest") })
      .returning({ id: schema.organizations.id });
    const [other] = await m.db
      .insert(schema.organizations)
      .values({ name: "vitest other", slug: slug.uniqueSlug("vitest-other") })
      .returning({ id: schema.organizations.id });
    orgId = org.id;
    otherOrgId = other.id;
  });

  afterAll(async () => {
    if (!m) return;
    const { organizations } = m.schema;
    await m.db.delete(organizations).where(m.orm.inArray(organizations.id, [orgId, otherOrgId].filter(Boolean)));
    await m.dbClient.end();
  });

  async function makeInvoice(total: number, org = orgId) {
    const [inv] = await m.db
      .insert(m.schema.invoices)
      .values({
        orgId: org,
        number: `T-${Math.random().toString(36).slice(2, 10)}`,
        contactName: "Test",
        contactPhone: "0000000",
        subtotal: String(total),
        total: String(total),
        publicToken: m.tokens.generatePublicToken(),
        status: "sent",
      })
      .returning({ id: m.schema.invoices.id });
    return inv.id;
  }

  it("hands out unique, gap-free numbers under concurrency", async () => {
    const numbers = await Promise.all(Array.from({ length: 20 }, () => m.numbering.nextDocumentNumber(orgId, "invoice")));
    expect(new Set(numbers).size).toBe(20);
    const seqs = numbers.map((n) => Number(n.slice(4))).sort((a, b) => a - b);
    expect(seqs[seqs.length - 1] - seqs[0]).toBe(19);
    expect(numbers[0]).toMatch(/^INV-\d{4}$/);
  });

  it("moves an invoice sent → partial → paid, and back on removal", async () => {
    const invoiceId = await makeInvoice(1000);
    const get = async () =>
      (await m.db.select().from(m.schema.invoices).where(m.orm.eq(m.schema.invoices.id, invoiceId)))[0];

    expect((await m.payments.applyPayment({ orgId, invoiceId, amount: 400, method: "cash" })).ok).toBe(true);
    expect((await get()).status).toBe("partial");
    expect(Number((await get()).amountPaid)).toBe(400);

    expect((await m.payments.applyPayment({ orgId, invoiceId, amount: 600, method: "upi" })).ok).toBe(true);
    expect((await get()).status).toBe("paid");

    const [p] = await m.db
      .select({ id: m.schema.payments.id })
      .from(m.schema.payments)
      .where(m.orm.and(m.orm.eq(m.schema.payments.invoiceId, invoiceId), m.orm.eq(m.schema.payments.amount, "600")));
    expect(await m.payments.removePayment(orgId, invoiceId, p.id)).toBe(true);
    expect((await get()).status).toBe("partial");
    expect(Number((await get()).amountPaid)).toBe(400);
  });

  it("doesn't lose a payment when two are recorded at the same moment", async () => {
    const invoiceId = await makeInvoice(1000);
    await Promise.all([
      m.payments.applyPayment({ orgId, invoiceId, amount: 300, method: "cash" }),
      m.payments.applyPayment({ orgId, invoiceId, amount: 200, method: "card" }),
    ]);
    const [inv] = await m.db.select().from(m.schema.invoices).where(m.orm.eq(m.schema.invoices.id, invoiceId));
    expect(Number(inv.amountPaid)).toBe(500);
    expect(inv.status).toBe("partial");
  });

  it("records a redelivered gateway payment only once", async () => {
    const invoiceId = await makeInvoice(1000);
    const providerPaymentId = `pay_${Math.random().toString(36).slice(2)}`;
    const input = { orgId, invoiceId, amount: 1000, method: "upi" as const, providerPaymentId, online: true };
    const results = await Promise.all([m.payments.applyPayment(input), m.payments.applyPayment(input)]);
    expect(results.filter((r) => r.ok && r.duplicate)).toHaveLength(1);
    const [inv] = await m.db.select().from(m.schema.invoices).where(m.orm.eq(m.schema.invoices.id, invoiceId));
    expect(Number(inv.amountPaid)).toBe(1000);
    expect(inv.status).toBe("paid");
  });

  it("rejects payments on void invoices and on another org's invoice", async () => {
    const invoiceId = await makeInvoice(500);
    await m.db.update(m.schema.invoices).set({ status: "void" }).where(m.orm.eq(m.schema.invoices.id, invoiceId));
    expect(await m.payments.applyPayment({ orgId, invoiceId, amount: 100, method: "cash" })).toEqual({
      ok: false,
      error: "This invoice is void — payments can't be recorded against it.",
    });

    const foreign = await makeInvoice(500, otherOrgId);
    expect(await m.payments.applyPayment({ orgId, invoiceId: foreign, amount: 100, method: "cash" })).toEqual({
      ok: false,
      error: "Invoice not found.",
    });
  });

  it("never lets concurrent usage take stock below zero", async () => {
    const [item] = await m.db
      .insert(m.schema.stockItems)
      .values({ orgId, name: "Oil", quantityOnHand: 5 })
      .returning({ id: m.schema.stockItems.id });

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        m.stock.applyStockMovement({ orgId, stockItemId: item.id, type: "usage", quantity: 1 }),
      ),
    );
    expect(results.filter((r) => r.ok).length).toBe(5);

    const [after] = await m.db.select().from(m.schema.stockItems).where(m.orm.eq(m.schema.stockItems.id, item.id));
    expect(after.quantityOnHand).toBe(0);

    const movements = await m.db
      .select()
      .from(m.schema.stockMovements)
      .where(m.orm.eq(m.schema.stockMovements.stockItemId, item.id));
    expect(movements).toHaveLength(5);
    expect(movements.every((mv) => mv.quantity === -1)).toBe(true);
  });

  it("scopes stock movements to the caller's org", async () => {
    const [item] = await m.db
      .insert(m.schema.stockItems)
      .values({ orgId: otherOrgId, name: "Foreign", quantityOnHand: 5 })
      .returning({ id: m.schema.stockItems.id });
    expect(await m.stock.applyStockMovement({ orgId, stockItemId: item.id, type: "usage", quantity: 1 })).toEqual({
      ok: false,
      error: "Item not found.",
    });
  });
});
