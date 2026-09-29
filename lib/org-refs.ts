import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, leads } from "@/db/schema";

// IDs that arrive in form fields (hidden inputs, selects) are
// client-controlled. Before writing one as a foreign key, confirm it
// belongs to the caller's org — otherwise a crafted request could attach a
// record to another business's lead/customer.
export async function ownedLeadId(orgId: string, id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const [row] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, id), eq(leads.orgId, orgId))).limit(1);
  return row?.id ?? null;
}

export async function ownedCustomerId(orgId: string, id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const [row] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, id), eq(customers.orgId, orgId))).limit(1);
  return row?.id ?? null;
}
