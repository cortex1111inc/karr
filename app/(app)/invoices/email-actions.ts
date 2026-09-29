"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { invoices, organizations, quotations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/billing/money";
import { sendEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site";

// Emails the customer a link to the public quote/invoice page.
export async function emailDocument(
  kind: "invoice" | "quotation",
  id: string,
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await requireUser();
  const to = z.string().trim().email("Enter a valid email address").max(254).safeParse(formData.get("to"));
  if (!to.success) return { error: to.error.issues[0]?.message ?? "Enter a valid email address" };

  const table = kind === "invoice" ? invoices : quotations;
  const [doc] = await db
    .select({ number: table.number, contactName: table.contactName, total: table.total, publicToken: table.publicToken })
    .from(table)
    .where(and(eq(table.id, id), eq(table.orgId, user.orgId)))
    .limit(1);
  if (!doc) return { error: "Not found." };

  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const label = kind === "invoice" ? "Invoice" : "Quotation";
  const url = `${getSiteUrl()}/${kind === "invoice" ? "invoice" : "quote"}/${doc.publicToken}`;

  const result = await sendEmail({
    orgId: user.orgId,
    kind,
    to: to.data,
    subject: `${label} ${doc.number} from ${org?.name ?? "us"}`,
    text: `Hi ${doc.contactName},\n\nHere is your ${label.toLowerCase()} ${doc.number} for ${formatCurrency(doc.total)}:\n${url}\n\nThanks,\n${org?.name ?? ""}`,
  });
  return { error: result.ok ? null : `Couldn't send: ${result.error}` };
}
