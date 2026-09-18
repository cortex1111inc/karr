import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";

// Atomically increments the org's counter and returns the next formatted
// number (e.g. "QUO-0007"). One UPDATE ... RETURNING — no read-then-write
// race between two staff creating documents at the same moment.
export async function nextDocumentNumber(orgId: string, kind: "quotation" | "invoice"): Promise<string> {
  const column = kind === "quotation" ? organizations.quotationCounter : organizations.invoiceCounter;
  const prefix = kind === "quotation" ? "QUO" : "INV";

  const [row] = await db
    .update(organizations)
    .set({ [kind === "quotation" ? "quotationCounter" : "invoiceCounter"]: sql`${column} + 1` })
    .where(sql`${organizations.id} = ${orgId}`)
    .returning({ value: column });

  return `${prefix}-${String(row.value).padStart(4, "0")}`;
}
