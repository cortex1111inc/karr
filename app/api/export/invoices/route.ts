import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";

export async function GET() {
  const user = await requireUser();

  const rows = await db
    .select({
      number: invoices.number,
      contactName: invoices.contactName,
      status: invoices.status,
      subtotal: invoices.subtotal,
      taxAmount: invoices.taxAmount,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .where(eq(invoices.orgId, user.orgId))
    .orderBy(desc(invoices.createdAt));

  const csv = toCsv(rows, [
    { key: "number", label: "Invoice #" },
    { key: "contactName", label: "Customer" },
    { key: "status", label: "Status" },
    { key: "subtotal", label: "Subtotal" },
    { key: "taxAmount", label: "Tax" },
    { key: "total", label: "Total" },
    { key: "amountPaid", label: "Paid" },
    { key: "createdAt", label: "Created" },
  ]);

  return csvResponse("invoices.csv", csv);
}
