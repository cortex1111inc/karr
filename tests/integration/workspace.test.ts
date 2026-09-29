// createWorkspace() runs after signup/onboarding. It must create exactly one
// org + owner profile per login, even if the form is submitted twice at once.
// Gated on TEST_DATABASE_URL like the other integration tests.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_DB = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB)("createWorkspace (real DB)", () => {
  const userId = randomUUID(); // profiles.id isn't FK'd to auth.users, so no real login is needed
  let m: {
    db: typeof import("@/db").db;
    dbClient: typeof import("@/db").dbClient;
    schema: typeof import("@/db/schema");
    orm: typeof import("drizzle-orm");
    ws: typeof import("@/lib/workspace");
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    const [dbm, schema, orm, ws] = await Promise.all([import("@/db"), import("@/db/schema"), import("drizzle-orm"), import("@/lib/workspace")]);
    m = { db: dbm.db, dbClient: dbm.dbClient, schema, orm, ws };
  });

  afterAll(async () => {
    if (!m) return;
    const rows = await m.db.select({ orgId: m.schema.profiles.orgId }).from(m.schema.profiles).where(m.orm.eq(m.schema.profiles.id, userId));
    for (const r of rows) await m.db.delete(m.schema.organizations).where(m.orm.eq(m.schema.organizations.id, r.orgId));
    // any org created by a losing concurrent attempt would have no profile; clean by name
    await m.db.delete(m.schema.organizations).where(m.orm.eq(m.schema.organizations.name, `vitest ws ${userId}`));
    await m.dbClient.end();
  });

  it("creates one org + owner profile, and is idempotent under concurrent submits", async () => {
    const input = { userId, email: `${userId}@example.test`, fullName: "Test Owner", businessName: `vitest ws ${userId}` };
    const results = await Promise.allSettled([m.ws.createWorkspace(input), m.ws.createWorkspace(input)]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    const profileRows = await m.db.select().from(m.schema.profiles).where(m.orm.eq(m.schema.profiles.id, userId));
    expect(profileRows).toHaveLength(1);
    expect(profileRows[0].role).toBe("owner");

    const orgs = await m.db.select().from(m.schema.organizations).where(m.orm.eq(m.schema.organizations.name, input.businessName));
    expect(orgs).toHaveLength(1); // the losing transaction rolled back its org insert
    expect(orgs[0].slug).toMatch(/^vitest-ws-/);

    const again = await m.ws.createWorkspace(input);
    expect(again).toEqual({ orgId: profileRows[0].orgId, created: false });
  });
});
