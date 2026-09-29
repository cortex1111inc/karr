// Real-database test for lead stage history and the booked -> vehicle rented
// link. Gated on TEST_DATABASE_URL, same throwaway-org pattern as the others.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)("lead stage changes (real DB)", () => {
  let orgId = "";
  let otherOrgId = "";
  let m: {
    db: typeof import("@/db").db;
    dbClient: typeof import("@/db").dbClient;
    schema: typeof import("@/db/schema");
    orm: typeof import("drizzle-orm");
    stage: typeof import("@/lib/lead-stage");
    tokens: typeof import("@/lib/tokens");
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    const [dbm, schema, orm, stage, tokens, slug] = await Promise.all([
      import("@/db"),
      import("@/db/schema"),
      import("drizzle-orm"),
      import("@/lib/lead-stage"),
      import("@/lib/tokens"),
      import("@/lib/slug"),
    ]);
    m = { db: dbm.db, dbClient: dbm.dbClient, schema, orm, stage, tokens };
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

  async function makeLead(vehicleId: string | null = null) {
    const [lead] = await m.db
      .insert(m.schema.leads)
      .values({ orgId, contactName: "T", contactPhone: "+919000000000", interest: "SUV", vehicleId, publicToken: m.tokens.generatePublicToken() })
      .returning({ id: m.schema.leads.id });
    return lead.id;
  }

  it("records each transition and ignores no-op changes", async () => {
    const leadId = await makeLead();
    expect(await m.stage.changeLeadStage({ orgId, leadId, to: "contacted", changedBy: null })).toEqual({ from: "new" });
    expect(await m.stage.changeLeadStage({ orgId, leadId, to: "contacted", changedBy: null })).toBeNull();
    await m.stage.changeLeadStage({ orgId, leadId, to: "quoted", changedBy: null });

    const history = await m.db
      .select({ from: m.schema.leadStageChanges.fromStage, to: m.schema.leadStageChanges.toStage })
      .from(m.schema.leadStageChanges)
      .where(m.orm.eq(m.schema.leadStageChanges.leadId, leadId))
      .orderBy(m.schema.leadStageChanges.changedAt);
    expect(history).toEqual([
      { from: "new", to: "contacted" },
      { from: "contacted", to: "quoted" },
    ]);
  });

  it("refuses to touch a lead from another org", async () => {
    const leadId = await makeLead();
    expect(await m.stage.changeLeadStage({ orgId: otherOrgId, leadId, to: "lost", changedBy: null })).toBeNull();
  });

  it("marks an available vehicle rented when its lead is booked", async () => {
    const [vehicle] = await m.db
      .insert(m.schema.vehicles)
      .values({ orgId, registrationNumber: "KL-01-T-0001" })
      .returning({ id: m.schema.vehicles.id });
    const leadId = await makeLead(vehicle.id);
    await m.stage.changeLeadStage({ orgId, leadId, to: "booked", changedBy: null });
    const [v] = await m.db.select({ status: m.schema.vehicles.status }).from(m.schema.vehicles).where(m.orm.eq(m.schema.vehicles.id, vehicle.id));
    expect(v.status).toBe("rented");
  });
});
