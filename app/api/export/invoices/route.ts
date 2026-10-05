import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { parseDateRange } from "@/lib/reports";

// Full export by default; ?from=&to= (YYYY-MM-DD, by invoice date) is an
// additional filtered option used from /reports.
export async function GET(request: Request) {
  const user = await requireUser();
  const params = new URL(request.url).searchParams;
  const range = parseDateRange(params.get("from"), params.get("to"));
  if ("error" in range) return new Response(range.error, { status: 400 });

  const where: SQL[] = [eq(invoices.orgId, user.orgId)];
  if (range.from) where.push(gte(invoices.createdAt, range.from));
  if (range.to) where.push(lte(invoices.createdAt, range.to));

  const rows = await db
    .select({
      number: invoices.number,
      contactName: invoices.contactName,
      customerGstin: invoices.customerGstin,
      placeOfSupply: invoices.placeOfSupply,
      status: invoices.status,
      subtotal: invoices.subtotal,
      gstRate: invoices.gstRate,
      taxAmount: invoices.taxAmount,
      interState: invoices.interState,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .where(and(...where))
    .orderBy(desc(invoices.createdAt));

  const csv = toCsv(
    rows.map((r) => ({ ...r, taxType: r.taxAmount === "0.00" ? "" : r.interState ? "IGST" : "CGST+SGST" })),
    [
      { key: "number", label: "Invoice #" },
      { key: "contactName", label: "Customer" },
      { key: "customerGstin", label: "Customer GSTIN" },
      { key: "placeOfSupply", label: "Place of supply" },
      { key: "status", label: "Status" },
      { key: "subtotal", label: "Subtotal" },
      { key: "gstRate", label: "GST %" },
      { key: "taxType", label: "Tax type" },
      { key: "taxAmount", label: "Tax" },
      { key: "total", label: "Total" },
      { key: "amountPaid", label: "Paid" },
      { key: "createdAt", label: "Created" },
    ],
  );

  const suffix = range.from || range.to ? `-${params.get("from") ?? "start"}-to-${params.get("to") ?? "now"}` : "";
  return csvResponse(`invoices${suffix}.csv`, csv);
}
